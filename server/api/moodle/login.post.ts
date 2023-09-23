import { generateDefaultHeaders, parseCookie, patterns, removeBreaks, setErrorResponse, validateBody } from "../../utils";
import { RateLimitAcceptance, handleRateLimit } from "../../ratelimit";
import { lookupSchoolMoodle } from "../../moodle";

const schema = {
    body: {
        session: { type: "string", required: true, size: 64 },
        school: { type: "number", required: true, max: 206568, min: 1 }
    }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    if (req.method !== "POST") return setErrorResponse(res, 405);

    if (req.headers["content-type"] !== "application/json") return setErrorResponse(res, 400, "Expected 'application/json' as 'content-type' header");

    const body = await readBody(event);

    const valid = validateBody(body, schema.body);
    // Just making sure the username isn't invalid (this is also tested in the frontend)
    if (!valid || !patterns.HEX_CODE.test(body.session)) return setErrorResponse(res, 400, schema);

    const rateLimit = handleRateLimit("/api/moodle/login.post", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { session, school } = body;

    const institutionLogin = `https://mo${school}.schule.hessen.de/login/index.php`;

    try {
        // We need to ensure that a moodle link of that school actually exists
        // That could be mo1000.schule.hessen.de (which might not exist)
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponse(res, 404, "Moodle doesn't exist for given school");

        // Sends request to SAMLSingleSignOn which provides a URL which actually requires
        // authentication in form of a SPH-Session cookie (provided by user in POST request)
        const samlSingleSignOn = (
            await fetch("https://loginproxy1.schulportal.hessen.de/?url=" + Buffer.from(institutionLogin).toString("base64"), {
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

        if (!proxySingleSignOnArtifact) return setErrorResponse(res, 401);

        // If the previous request was sucessful, we can now GET to this location, which will
        // redirect us back to the Moodle Login page (/login/index.php) with a Paula cookie
        // This Paula cookie is then needed for authentication in Moodle
        const redirectToMoodle = (
            await fetch(proxySingleSignOnArtifact, {
                redirect: "manual",
                headers: generateDefaultHeaders(address)
            })
        ).headers;
        // This has to be dynamic so it can apply to multiple institutions
        const moodleRedirectCookies = parseCookie(redirectToMoodle.get("set-cookie") || "");
        const paulaCookie = moodleRedirectCookies["Paula"];
        if (redirectToMoodle.get("location") !== institutionLogin || !paulaCookie) return setErrorResponse(res, 401);

        const moodleLogin = await fetch(institutionLogin, {
            redirect: "manual",
            headers: {
                Cookie: `Paula=${paulaCookie}`,
                ...generateDefaultHeaders(address)
            }
        });

        // A successful request to login on Moodle must return a 303 code
        // along with a location header with a "testsession" redirect with the user ID
        const locationHeader = moodleLogin.headers.get("location");
        if (moodleLogin.status !== 303 || locationHeader === null) return setErrorResponse(res, 401);

        const loginValidation = locationHeader.match(/^(?:https:\/\/mo(?:[0-9]{1,6})\.schule\.hessen\.de\/login\/index.php\?testsession=)([0-9]+)$/i);
        // We would expect that in index 1 is the user ID
        if (loginValidation === null || !loginValidation[1]) return setErrorResponse(res, 401);

        // Using this we may attempt to request the /my/ page of moodle
        // and there fetch the session key which is embedded in a logoff menu
        const moodleSession = parseCookie(moodleLogin.headers.get("set-cookie") || "")["MoodleSession"];
        if (!moodleSession) return setErrorResponse(res, 401);
        const mainPage = await fetch(`https://mo${school}.schule.hessen.de/my/`, {
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
            paula: paulaCookie,
            user: parseInt(loginValidation[1])
        };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
