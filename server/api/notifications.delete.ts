import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { isSubscriptionService, patterns, setErrorResponseEvent, STATIC_STRINGS } from "../utils";
import { SchemaEntryConsumer, validateBodyNew } from "../validator";

const bodySchema: SchemaEntryConsumer = {
    endpoint: { required: true, type: "string", max: 300 },
    auth: { required: true, type: "string", pattern: patterns.NOTIFICATION_AUTH },
    p256dh: { required: true, type: "string", pattern: patterns.NOTIFICATION_P256DH }
};

const rlHandler = defineRateLimit({ interval: 60, allowed_per_interval: 2 });
export default defineEventHandler(async (event) => {
    if (getRequestHeader(event, "Content-Type") !== STATIC_STRINGS.MIME_JSON)
        return setErrorResponseEvent(event, 400, STATIC_STRINGS.CONTENT_TYPE_NO_JSON);

    const body = await readBody<{ endpoint: string; auth: string; p256dh: string }>(event);
    const bodyValidation = validateBodyNew(bodySchema, body);
    if (bodyValidation.violations > 0 || bodyValidation.invalid) return setErrorResponseEvent(event, 400, bodyValidation);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);
    const address = getRequestAddress(event);

    const config = useRuntimeConfig();

    try {
        const url = new URL(body.endpoint);
        if (!isSubscriptionService(url.host)) return setErrorResponseEvent(event, 400, "No valid subscription service");
    } catch (error) {
        return setErrorResponseEvent(event, 400, "Invalid endpoint URL");
    }

    try {
        const { url, key } = config.private.notificationApi;
        if (!(url || key)) return setErrorResponseEvent(event, 503);

        const response = await fetch(url, {
            method: "DELETE",
            headers: {
                Authorization: key,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        if (response.status !== 200) return setErrorResponseEvent(event, response.status);
        return { error: false };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
