import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import { generateDefaultHeaders, patterns, removeBreaks, setErrorResponse, transformEndpointSchema, validateBody } from "../utils";
const schema = {
    body: {
        token: { type: "string", required: true, pattern: patterns.SESSION_OR_AUTOLOGIN },
        ikey: { type: "string", required: true, size: 32, pattern: patterns.HEX_CODE },
        sid: { type: "string", required: true, pattern: patterns.SID },
        code: { type: "string", required: true, pattern: patterns.PW_RESET_CODE }
    }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    if (req.method !== "PUT") return setErrorResponse(res, 405);

    if (req.headers["content-type"] !== "application/json") return setErrorResponse(res, 400, "Expected 'application/json' as 'content-type' header");

    const body = await readBody<{ token: string; ikey: string; sid: string; code: string }>(event);

    if (!validateBody(body, schema.body)) return setErrorResponse(res, 400, transformEndpointSchema(schema));

    const rateLimit = handleRateLimit("/api/resetpassword.put", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { token, ikey, sid, code } = body;
    const requestForm = [
        "b=step3",
        `ikey=${encodeURIComponent(ikey)}`,
        `token1=${encodeURIComponent(token)}`,
        `token2=${encodeURIComponent(code.toLowerCase())}`
    ].join("&");

    try {
        const raw = await fetch("https://start.schulportal.hessen.de/benutzerverwaltung.php?a=userPWreminder", {
            method: "POST",
            headers: {
                Cookie: `sid=${encodeURIComponent(sid)}`,
                "Content-Type": "application/x-www-form-urlencoded",
                ...generateDefaultHeaders(address)
            },
            body: requestForm
        });

        const html = removeBreaks(await raw.text());
        const passwordMatch = html.match(/(?:<div class="alert alert-success"> Das neue Passwort lautet: <b>)(.+)(?:<\/b>)/i);
        if (passwordMatch === null) return setErrorResponse(res, 400, "Falscher Code");

        const password = passwordMatch[1];
        if (!password) return setErrorResponse(res, 400, "Falscher Code");

        return { error: false, password };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
