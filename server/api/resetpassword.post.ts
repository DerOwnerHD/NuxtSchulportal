import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import { APIError, generateDefaultHeaders, parseCookie, patterns, removeBreaks, setErrorResponse, validateBody } from "../utils";
const schema = {
    body: {
        username: { type: "string", required: true, max: 32 },
        type: { type: "number", required: true, min: 0, max: 2 },
        birthday: { type: "string", required: true },
        school: { type: "number", required: true, max: 206568, min: 1 }
    }
};
const USER_TYPE = ["Schueler", "Eltern", "Lehrer"];

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    if (req.method !== "POST") return setErrorResponse(res, 405);

    if (req.headers["content-type"] !== "application/json") return setErrorResponse(res, 400, "Expected 'application/json' as 'content-type' header");

    const body = await readBody(event);

    const valid = validateBody(body, schema.body);
    // Just making sure the username isn't invalid (this is also tested in the frontend)
    if (!valid || !patterns.USERNAME.test(body.username) || !patterns.BIRTHDAY.test(body.birthday)) return setErrorResponse(res, 400, schema);

    const rateLimit = handleRateLimit("/api/resetpassword.post", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { username, type, birthday, school } = body;

    try {
        // We need to fetch this for obtaining that ikey (whatever that is)
        const firstStep = await fetch("https://start.schulportal.hessen.de/benutzerverwaltung.php?a=userPWreminder&i=" + school, {
            method: "GET",
            redirect: "manual",
            headers: generateDefaultHeaders(address)
        });

        const { sid } = parseCookie(firstStep.headers.get("set-cookie") || "");
        if (!sid) throw TypeError();

        const html = removeBreaks(await firstStep.text());
        const firstIkey = readIkey(html);

        if (firstIkey === null) throw new APIError("Expected ikey value from Schulportal", true);

        const requestForm = [
            "b=step2",
            `ikey=${firstIkey}`,
            `login=${encodeURIComponent(username)}`,
            `check=${encodeURIComponent(birthday)}`,
            `type=${USER_TYPE[+type] || "Schueler"}`
        ].join("&");

        const secondStep = await fetch("https://start.schulportal.hessen.de/benutzerverwaltung.php?a=userPWreminder", {
            method: "POST",
            headers: {
                Cookie: `sid=${sid}`,
                "Content-Type": "application/x-www-form-urlencoded",
                ...generateDefaultHeaders(address)
            },
            body: requestForm
        });

        const secondHTML = removeBreaks(await secondStep.text());
        if (!/<input id="token2"/i.test(secondHTML)) throw new APIError("Expected token in response HTML from Schulportal", true);

        const token = secondHTML.match(/(?:<input type="hidden" name="token1" value=")([a-f0-9]{64})(?:"( \/)?>)/i)![1];
        const secondIkey = readIkey(secondHTML);

        return { error: false, token, ikey: secondIkey, sid };
    } catch (error) {
        console.error(error);
        let errorDetails;
        if (error instanceof APIError && error.showToUser) errorDetails = error.message;
        return setErrorResponse(res, 500, errorDetails);
    }
});

function readIkey(html: string): string | null {
    const ikeyMatch = html.match(/(?:<input type="hidden" name="ikey" value=")([a-f0-9]{32})(?:"( \/)?>)/i);
    if (ikeyMatch === null) return null;
    const ikey = ikeyMatch[1];
    if (!ikey || ikey.length !== 32 || /[^0-9a-f]/gi.test(ikey)) return null;

    return ikey;
}
