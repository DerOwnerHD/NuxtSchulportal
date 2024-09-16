import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import { generateDefaultHeaders, patterns, removeBreaks, setErrorResponse, STATIC_STRINGS } from "../utils";
import { SchemaEntryConsumer, validateBodyNew } from "../validator";
const bodySchema: SchemaEntryConsumer = {
    token: { type: "string", required: true, pattern: patterns.SESSION_OR_AUTOLOGIN },
    ikey: { type: "string", required: true, size: 32, pattern: patterns.HEX_CODE },
    sid: { type: "string", required: true, pattern: patterns.SID },
    code: { type: "string", required: true, pattern: patterns.PW_RESET_CODE }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = getRequestIP(event, { xForwardedFor: true });

    if (req.headers["content-type"] !== "application/json") return setErrorResponse(res, 400, STATIC_STRINGS.CONTENT_TYPE_NO_JSON);
    const body = await readBody<{ token: string; ikey: string; sid: string; code: string }>(event);
    const bodyValidation = validateBodyNew(bodySchema, body);
    if (bodyValidation.violations > 0 || bodyValidation.invalid) return setErrorResponse(res, 400, bodyValidation);

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
        const response = await fetch("https://start.schulportal.hessen.de/benutzerverwaltung.php?a=userPWreminder", {
            method: "POST",
            headers: {
                Cookie: `sid=${sid}`,
                "Content-Type": "application/x-www-form-urlencoded",
                ...generateDefaultHeaders(address)
            },
            body: requestForm
        });

        const html = removeBreaks(await response.text());
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
