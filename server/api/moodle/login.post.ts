import { BasicResponse, generateDefaultHeaders, parseCookies, patterns, removeBreaks, setErrorResponse, STATIC_STRINGS } from "../../utils";
import { RateLimitAcceptance, handleRateLimit } from "../../ratelimit";
import { generateMoodleURL, lookupSchoolMoodle } from "../../moodle";
import { SchemaEntryConsumer, validateBodyNew } from "~/server/validator";

const bodySchema: SchemaEntryConsumer = {
    session: { type: "string", required: true, size: 64, pattern: patterns.HEX_CODE },
    school: { type: "number", required: true, max: 206568, min: 1 }
};

interface Response extends BasicResponse {
    cookie: string;
    session: string;
    paula: string;
    user: number;
}

export default defineEventHandler<Promise<Response>>(async (event) => {
    const { req, res } = event.node;
    const address = getRequestIP(event, { xForwardedFor: true });

    if (req.headers["content-type"] !== "application/json") return setErrorResponse(res, 400, STATIC_STRINGS.CONTENT_TYPE_NO_JSON);

    const body = await readBody<{ session: string; school: number }>(event);
    const bodyValidation = validateBodyNew(bodySchema, body);
    if (bodyValidation.violations > 0 || bodyValidation.invalid) return setErrorResponse(res, 400, bodyValidation);

    const rateLimit = handleRateLimit("/api/moodle/login.post", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { session, school } = body;

    const institutionLogin = `${generateMoodleURL(school)}/login/index.php`;

    try {
        // We need to ensure that a moodle link of that school actually exists
        // That could be mo1000.schule.hessen.de (which might not exist)
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponse(res, 404, STATIC_STRINGS.MOODLE_SCHOOL_NOT_EXIST);

        // Sends request to SAMLSingleSignOn which provides a URL which actually requires
        // authentication in form of a SPH-Session cookie (provided by user in POST request)
        // Moved to llngproxy01.schulportal.hessen.de in some update
        const samlSingleSignOn = (
            await fetch("https://llngproxy01.schulportal.hessen.de//?url=" + Buffer.from(institutionLogin).toString("base64"), {
                redirect: "manual",
                headers: generateDefaultHeaders(address)
            })
        ).headers.get("location");

        if (!samlSingleSignOn) throw new ReferenceError("Couldn't load samlSingleSignOn URL");

        // This endpoints requires (as previously mentioned) a SPH-Session Cookie to give
        // us the next URL, which is a proxySingleSignOnArtifact URL
        const proxySingleSignOnArtifact = (
            await fetch(samlSingleSignOn, {
                redirect: "manual",
                headers: {
                    Cookie: `SPH-Session=${session}`,
                    ...generateDefaultHeaders(address)
                }
            })
        ).headers.get("location");

        // The proxySingleSignOnArtifact has been moved to llngproxy01.schulportal.hessen.de as well
        if (!proxySingleSignOnArtifact) return setErrorResponse(res, 401);

        // If the previous request was sucessful, we can now GET to this location, which will
        // redirect us back to the Moodle Login page (/login/index.php) with a Paula cookie
        // This Paula cookie is then needed for authentication in Moodle
        const redirectToMoodle = await fetch(proxySingleSignOnArtifact, {
            redirect: "manual",
            headers: {
                Cookie: `SPH-Session=${session}`,
                ...generateDefaultHeaders(address)
            }
        });

        // This has to be dynamic so it can apply to multiple institutions
        const moodleRedirectCookies = parseCookies(redirectToMoodle.headers.getSetCookie());
        // This cookie is NEW and appears to replace the Paula cookie
        const moodleCookie = moodleRedirectCookies["mo-prod01"];
        // The site should normally always redirect to Moodle, but if it does not, we know
        // something has to have gone wrong, most likely some maintenance
        if (redirectToMoodle.status !== 302) return setErrorResponse(res, 503, "Wartungsarbeiten");
        if (redirectToMoodle.headers.get("location") !== institutionLogin || !moodleCookie) return setErrorResponse(res, 401);

        const moodleLogin = await fetch(institutionLogin, {
            redirect: "manual",
            headers: {
                Cookie: `mo-prod01=${moodleCookie}`,
                ...generateDefaultHeaders(address)
            }
        });

        // A successful request to login on Moodle must return a 303 code
        // along with a location header with a "testsession" redirect with the user ID
        const locationHeader = moodleLogin.headers.get("location");
        if (moodleLogin.status !== 303 || locationHeader === null) return setErrorResponse(res, 401);

        // TODO: De-hardcode that stuff
        const loginValidation = locationHeader.match(
            /^(?:https:\/\/mo(?:[0-9]{1,6})\.schulportal\.hessen\.de\/login\/index.php\?testsession=)([0-9]+)$/i
        );
        // We would expect that in index 1 is the user ID
        if (loginValidation === null || !loginValidation[1]) return setErrorResponse(res, 401);

        // Using this we may attempt to request the /my/ page of moodle
        // and there fetch the session key which is embedded in a logoff menu
        const moodleSession = parseCookies(moodleLogin.headers.getSetCookie())["MoodleSession"];
        if (!moodleSession) return setErrorResponse(res, 401);
        const mainPage = await fetch(`${generateMoodleURL(school)}/my/`, {
            redirect: "manual",
            headers: {
                Cookie: `MoodleSession=${moodleSession}`,
                ...generateDefaultHeaders(address)
            }
        });

        const mainPageContent = removeBreaks(await mainPage.text());
        const sessionKeyMatch = mainPageContent.match(/(?:logout\.php\?sesskey=)([a-z0-9]{10})/i);
        if (sessionKeyMatch === null || !sessionKeyMatch[1]) return setErrorResponse(res, 401);

        return {
            error: false,
            cookie: moodleSession,
            session: sessionKeyMatch[1],
            // We'll just pretend that this is actually still called Paula...
            // (just on the frontend por favor)
            paula: moodleCookie,
            user: parseInt(loginValidation[1])
        };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
