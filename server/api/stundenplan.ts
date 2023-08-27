import { APIError, generateDefaultHeaders, parseCookie, removeBreaks, setErrorResponse } from "../utils";
import { JSDOM } from "jsdom";

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    if (req.method !== "GET") return setErrorResponse(res, 405);

    if (!req.headers.authorization) return setErrorResponse(res, 400, "'authorization' header missing");
    if (!/^[a-z0-9]{26}$/.test(req.headers.authorization)) return setErrorResponse(res, 400, "'authorization' header invalid");

    try {
        // We don't want to follow redirects cause in case
        // we aren't logged in and should get redirected, we
        // want to prevent this unhandled behaviour
        const raw = await fetch("https://start.schulportal.hessen.de/stundenplan.php", {
            headers: {
                Cookie: `sid=${encodeURIComponent(req.headers.authorization)}`,
                ...generateDefaultHeaders(address)
            },
            redirect: "manual"
        });

        // There might be a redirect, as the server might be down
        // Even if there is no logged in user, the server will still 200
        if (raw.status !== 200) throw new APIError("Couldn't load SPlan");

        const { i } = parseCookie(raw.headers.get("set-cookie") || "");
        // The cookie might either be nonexistent or set to 0 if the user isn't logged in
        if (typeof i === "undefined" || i == "0") return setErrorResponse(res, 401);

        const { window } = new JSDOM(removeBreaks(await raw.text()));
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 503);
    }
});
