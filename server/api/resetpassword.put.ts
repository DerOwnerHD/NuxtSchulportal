import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { generateDefaultHeaders, patterns, removeBreaks, setErrorResponseEvent, STATIC_STRINGS } from "../utils";
import { SchemaEntryConsumer, validateBodyNew } from "../validator";
const bodySchema: SchemaEntryConsumer = {
    token: { type: "string", required: true, pattern: patterns.SESSION_OR_AUTOLOGIN },
    ikey: { type: "string", required: true, size: 32, pattern: patterns.HEX_CODE },
    sid: { type: "string", required: true, pattern: patterns.SID },
    code: { type: "string", required: true, pattern: patterns.PW_RESET_CODE }
};

const rlHandler = defineRateLimit({ interval: 60, allowed_per_interval: 2 });
export default defineEventHandler(async (event) => {
    if (getRequestHeader(event, "Content-Type") !== STATIC_STRINGS.MIME_JSON)
        return setErrorResponseEvent(event, 400, STATIC_STRINGS.CONTENT_TYPE_NO_JSON);
    const body = await readBody<{ token: string; ikey: string; sid: string; code: string }>(event);
    const bodyValidation = validateBodyNew(bodySchema, body);
    if (bodyValidation.violations > 0 || bodyValidation.invalid) return setErrorResponseEvent(event, 400, bodyValidation);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);

    const address = getRequestAddress(event) as string;

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
        if (passwordMatch === null) return setErrorResponseEvent(event, 400, "Falscher Code");

        const password = passwordMatch[1];
        if (!password) return setErrorResponseEvent(event, 400, "Falscher Code");

        return { error: false, password };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
