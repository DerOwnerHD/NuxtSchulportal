import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import { patterns, setErrorResponse, transformEndpointSchema, validateBody } from "../utils";

const schema = {
    body: {
        endpoint: { required: true, type: "string", pattern: patterns.NOTIFICATION_ENDPOINT },
        auth: { required: true, type: "string", pattern: patterns.NOTIFICATION_AUTH },
        p256dh: { required: true, type: "string", pattern: patterns.NOTIFICATION_P256DH }
    }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    if (req.headers["content-type"] !== "application/json") return setErrorResponse(res, 400, "Expected 'application/json' as 'content-type' header");

    const body = await readBody(event);
    const valid = validateBody(body, schema.body);
    if (!valid) return setErrorResponse(res, 400, transformEndpointSchema(schema));

    const rateLimit = handleRateLimit("/api/notifications.post", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    try {
        const url = process.env.NOTIFICATIONS_API_URL;
        const key = process.env.NOTIFICATIONS_API_KEY;

        console.log(key);

        if (!url || !key) return setErrorResponse(res, 503);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: key
            },
            body: JSON.stringify({ endpoint: body.endpoint, auth: body.auth, p256dh: body.p256dh })
        });

        if (response.status !== 200) return setErrorResponse(res, 503);
        return { error: false };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
