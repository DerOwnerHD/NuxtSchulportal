import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import { generateDefaultHeaders, parseCookie, patterns, removeBreaks, setErrorResponse, setResponse, validateBody } from "../utils";
// For some reason "Universität Kassel (Fachbereich 2) Kassel" has id 206568, like why?
const schema = {
    body: {
        username: { type: "string", required: true, max: 32 },
        password: { type: "string", required: true, max: 100 },
        school: { type: "number", required: true, max: 206568, min: 1 },
        autologin: { type: "boolean", required: false }
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
    if (!valid || !patterns.USERNAME.test(body.username)) return setErrorResponse(res, 400, schema);

    const rateLimit = handleRateLimit("/api/login", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { username, password, school, autologin } = body;
    const requestForm = [
        `user=${encodeURIComponent(`${school}.${username}`)}`,
        `password=${encodeURIComponent(password)}`,
        `stayconnected=${+!!autologin}`
    ].join("&");

    try {
        const login = await fetch("https://login.bildung.hessen.de", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                ...generateDefaultHeaders(address)
            },
            body: requestForm,
            redirect: "manual"
        });

        if (!login.headers.get("set-cookie")) throw new ReferenceError("Expected a 'set-cookie' header from Schulportal");

        const cookies = parseCookie(login.headers.get("set-cookie")!);
        const session = cookies["SPH-Session"];
        if (!session) {
            const html = removeBreaks(await login.text());
            const cooldownMatch = html.match(/(?:<span id="authErrorLocktime">)([0-9]{1,2})(?:<\/span>)/i);
            if (cooldownMatch === null) return setErrorResponse(res, 401);
            const cooldown = parseInt(cooldownMatch[1]);
            // This is manually inserted as setErrorResponse gives no way of adding other properties
            setErrorResponse(res, 401);
            return {
                error: true,
                error_details: "401: Unauthorized",
                cooldown
            };
        }

        const autologinToken = await (async (autologin) => {
            if (!autologin) return;
            // Our autologin token next needed is hidden away in some
            // form which is autosubmitted, so we need to read that out
            const html = removeBreaks(await login.text());
            const tokenMatch = html.match(patterns.EMBEDDED_TOKEN);
            if (tokenMatch === null) return;
            // We need to use the second index because the first would be the whole string
            // including the <input> stuff we put in the non-capturing group
            // Example: [ "<input value="1234567890abcdef">", "1234567890abcdef" ]
            const token = tokenMatch[1];
            if (!token || !patterns.SESSION_OR_AUTOLOGIN.test(token)) return;

            const registerBrowser = await fetch("https://login.schulportal.hessen.de/registerbrowser", {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Cookie: `SPH-Session=${session}`,
                    ...generateDefaultHeaders(address)
                },
                method: "POST",
                body: [`token=${token}`, `fg=WeNeedToFillThese32CharactersMan`].join("&"),
                redirect: "manual"
            });

            const cookies = parseCookie(registerBrowser.headers.get("set-cookie") || "");
            const cookie = cookies["SPH-AutoLogin"];

            if (registerBrowser.status !== 302 || !cookie) return;

            return cookie;
        })(autologin);

        const connect = await fetch("https://connect.schulportal.hessen.de", {
            method: "HEAD",
            redirect: "manual",
            headers: {
                Cookie: `SPH-Session=${session}`,
                ...generateDefaultHeaders(address)
            }
        });

        const location = connect.headers.get("location");
        if (!location || !location.startsWith("https://start.schulportal.hessen.de/schulportallogin.php?k") || connect.status !== 302)
            return setErrorResponse(res, 401);

        const spLogin = await fetch(location, {
            method: "HEAD",
            redirect: "manual",
            headers: generateDefaultHeaders(address)
        });

        if (!spLogin.headers.get("set-cookie")) return setErrorResponse(res, 503);

        return setResponse(res, 200, {
            error: false,
            token: parseCookie(spLogin.headers.get("set-cookie")!)["sid"],
            session: session,
            autologin: autologinToken
        });
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
