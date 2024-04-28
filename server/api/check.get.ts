import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import {
    authHeaderOrQuery,
    generateDefaultHeaders,
    patterns,
    schoolFromRequest,
    setErrorResponse,
    transformEndpointSchema,
    validateQuery
} from "../utils";

// Both of these are provided sometimes, other times it sends us a pretty error page.
// If the token is indeed valid, the remaining time would be in the 700s or 800s
const INVALID_TIMES = ["0", "300", "100000"];
export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const token = authHeaderOrQuery(event);
    if (token === null) return setErrorResponse(res, 400, "Token not provided or malformed");

    const rateLimit = handleRateLimit("/api/check.get", address, req.headers["x-ratelimit-bypass"]);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    try {
        const response = await fetch("https://start.schulportal.hessen.de/ajax_login.php", {
            headers: {
                Cookie: `sid=${token}; ${schoolFromRequest(event)}`,
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/x-www-form-urlencoded",
                ...generateDefaultHeaders(address)
            },
            body: `name=${token}`,
            redirect: "manual",
            method: "POST"
        });

        const text = await response.text();

        const valid = text.length > 0 && text.length < 5 && !INVALID_TIMES.includes(text);
        const remaining = valid ? parseInt(text) : null;

        return { error: false, valid, remaining };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
