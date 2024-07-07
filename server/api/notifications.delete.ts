import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import { isSubscriptionService, patterns, setErrorResponse, STATIC_STRINGS } from "../utils";
import { SchemaEntryConsumer, validateBodyNew } from "../validator";

const bodySchema: SchemaEntryConsumer = {
    endpoint: { required: true, type: "string", max: 300 },
    auth: { required: true, type: "string", pattern: patterns.NOTIFICATION_AUTH },
    p256dh: { required: true, type: "string", pattern: patterns.NOTIFICATION_P256DH }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    if (req.headers["content-type"] !== "application/json") return setErrorResponse(res, 400, STATIC_STRINGS.CONTENT_TYPE_NO_JSON);

    const body = await readBody<{ endpoint: string; auth: string; p256dh: string }>(event);
    const bodyValidation = validateBodyNew(bodySchema, body);
    if (bodyValidation.violations > 0 || bodyValidation.invalid) return setErrorResponse(res, 400, bodyValidation);

    const rateLimit = handleRateLimit("/api/notifications.delete", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const config = useRuntimeConfig();

    try {
        const url = new URL(body.endpoint);
        if (!isSubscriptionService(url.host)) return setErrorResponse(res, 400, "No valid subscription service");
    } catch (error) {
        return setErrorResponse(res, 400, "Invalid endpoint URL");
    }

    try {
        const { url, key } = config.private.notificationApi;
        if (!(url || key)) return setErrorResponse(res, 503);

        const response = await fetch(url, {
            method: "DELETE",
            headers: {
                Authorization: key,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        if (response.status !== 200) return setErrorResponse(res, response.status);
        return { error: false };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
