import { defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { generateDefaultHeaders, parseCookies, patterns, removeBreaks, setErrorResponseEvent, STATIC_STRINGS } from "../utils";
import { SchemaEntryConsumer, validateBodyNew } from "../validator";
const bodySchema: SchemaEntryConsumer = {
    autologin: { type: "string", pattern: patterns.SESSION_OR_AUTOLOGIN, required: true }
};
// This gets used in soo many requests here, just gonna store it
const LOGIN_URL = "https://login.schulportal.hessen.de/";

const rlHandler = defineRateLimit({ interval: 60, allowed_per_interval: 3 });
export default defineEventHandler(async (event) => {
    if (getRequestHeader(event, "Content-Type") !== STATIC_STRINGS.MIME_JSON)
        return setErrorResponseEvent(event, 400, STATIC_STRINGS.CONTENT_TYPE_NO_JSON);

    const body = await readBody<{ autologin: string }>(event);
    const bodyValidation = validateBodyNew(bodySchema, body);
    if (bodyValidation.violations > 0 || bodyValidation.invalid) return setErrorResponseEvent(event, 400, bodyValidation);

    const rl = rlHandler(event);
    if (rl !== null) return rl;
    const address = getRequestAddress(event);

    const { autologin } = body;

    try {
        const obtainToken = await fetch(LOGIN_URL, {
            method: "GET",
            headers: {
                Cookie: `SPH-AutoLogin=${autologin}`,
                ...generateDefaultHeaders(address)
            }
        });
        const tokenHtml = removeBreaks(await obtainToken.text());
        const tokenMatch = tokenHtml.match(patterns.EMBEDDED_TOKEN);

        if (tokenMatch === null || tokenMatch.length !== 2) return setErrorResponseEvent(event, 401);
        const token = tokenMatch[1];

        // The fg in the body refers to the client browser fingerprint
        // Only god knows what that might be used for on the server (storing
        // it just by that most likely and nothing else). Calculating
        // that from the client just takes time we need not taking
        const obtainSession = await fetch(LOGIN_URL, {
            method: "POST",
            headers: {
                Cookie: `SPH-AutoLogin=${autologin}`,
                "Content-Type": "application/x-www-form-urlencoded",
                ...generateDefaultHeaders(address)
            },
            body: `token=${token}&fg=HalloSchulportalWarumFingerprint`,
            redirect: "manual"
        });

        // If the token worked before then it HAS to work now or
        // else their system is broken (or they changed it who knows)
        // NOTE: Although SPH wants us to go to the login url, we can
        // just skip this step lol
        if (obtainSession.status !== 302 || obtainSession.headers.get("location") !== LOGIN_URL) return setErrorResponseEvent(event, 503);

        const sessionCookies = parseCookies(obtainSession.headers.getSetCookie());
        const session = sessionCookies["SPH-Session"];

        if (!session || !patterns.SESSION_OR_AUTOLOGIN.test(session)) return setErrorResponseEvent(event, 401);

        // By this point we should have obtained the SPH-Session cookie
        // and can thusly proceed to basically normal login procedures
        const bitCONNEEEECT = await fetch("https://connect.schulportal.hessen.de/", {
            method: "GET",
            headers: {
                Cookie: `SPH-Session=${session}`,
                ...generateDefaultHeaders(address)
            },
            redirect: "manual"
        });

        const sphLogin = bitCONNEEEECT.headers.get("location") || "";
        if (bitCONNEEEECT.status !== 302 || patterns.SPH_LOGIN_KEY.test(sphLogin)) return setErrorResponseEvent(event, 401);

        const schulportalLogin = await fetch(sphLogin, {
            method: "GET",
            headers: generateDefaultHeaders(address)
        });

        const { sid } = parseCookies(schulportalLogin.headers.getSetCookie());
        if (!sid || !patterns.SID.test(sid)) return setErrorResponseEvent(event, 401);

        return {
            error: false,
            session,
            token: sid
        };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
