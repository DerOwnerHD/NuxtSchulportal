import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import { generateDefaultHeaders, patterns, setErrorResponse } from "../utils";

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    if (!req.headers.authorization) return setErrorResponse(res, 400, "'authorization' header missing");
    if (!patterns.SID.test(req.headers.authorization)) return setErrorResponse(res, 400, "'authorization' header invalid");

    const rateLimit = handleRateLimit("/api/check.get", address, req.headers["x-ratelimit-bypass"]);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    try {
        const raw = await fetch("https://start.schulportal.hessen.de/startseite.php?a=ajax", {
            headers: {
                Cookie: `sid=${encodeURIComponent(req.headers.authorization)}`,
                ...generateDefaultHeaders(address)
            },
            redirect: "manual",
            method: "HEAD"
        });

        // This would indicate that the server is under maintenance
        if (raw.status === 503) return setErrorResponse(res, 503);

        return { error: false, valid: raw.status !== 302 };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 503);
    }
});
