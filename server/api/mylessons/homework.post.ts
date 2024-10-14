import { COURSE_UNAVAILABLE_ERROR } from "~/server/mylessons";
import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { generateDefaultHeaders, getAuthToken, setErrorResponseEvent, getOptionalSchool, BasicResponse, STATIC_STRINGS } from "../../utils";
import { hasInvalidAuthentication, hasInvalidSidRedirect, hasPasswordResetLocationSet } from "~/server/failsafe";
import { SchemaEntryConsumer, validateBodyNew } from "~/server/validator";

const bodySchema: SchemaEntryConsumer = {
    action: { type: "string", required: true, pattern: /^(done|undone)$/ },
    id: { type: "number", required: true, min: 1, max: 100000 },
    lesson: { type: "number", required: true, min: 1, max: 1000 }
};

const rlHandler = defineRateLimit({ interval: 15, allowed_per_interval: 4 });
export default defineEventHandler<Promise<BasicResponse>>(async (event) => {
    if (getRequestHeader(event, "Content-Type") !== STATIC_STRINGS.MIME_JSON)
        return setErrorResponseEvent(event, 400, STATIC_STRINGS.CONTENT_TYPE_NO_JSON);

    const body = await readBody<{ action: "done" | "undone"; id: number; lesson: number }>(event);
    const bodyValidation = validateBodyNew(bodySchema, body);
    if (bodyValidation.violations > 0 || bodyValidation.invalid) return setErrorResponseEvent(event, 400, bodyValidation);

    const token = getAuthToken(event);
    if (token === null) return setErrorResponseEvent(event, 400, STATIC_STRINGS.INVALID_TOKEN);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);
    const address = getRequestAddress(event);

    const { action, id, lesson } = body;

    try {
        const response = await fetch("https://start.schulportal.hessen.de/meinunterricht.php", {
            headers: {
                Cookie: `sid=${token}; ${getOptionalSchool(event)}`,
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest",
                ...generateDefaultHeaders(address)
            },
            body: `a=sus_homeworkDone&id=${id}&entry=${lesson}&b=${action}`,
            redirect: "manual",
            method: "POST"
        });

        if (hasInvalidSidRedirect(response)) return setErrorResponseEvent(event, 403, "Route gesperrt");
        if (hasInvalidAuthentication(response)) return setErrorResponseEvent(event, 401);
        if (hasPasswordResetLocationSet(response)) return setErrorResponseEvent(event, 418, "Lege dein Passwort fest");

        const text = await response.text();
        // This is the restrictor that occurs when the class is hidden for the user
        if (text.includes(COURSE_UNAVAILABLE_ERROR)) return setErrorResponseEvent(event, 403, "Class not available for user");
        // There is no other way to check - so if the request
        // ACTUALLY succeeded we have no real way of knowing
        // For example: If the lesson doesn't even exist or has
        // no homework set to it, is already done or undone, the
        // response does not tell us that.
        return { error: text !== "1" };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
