import { COURSE_UNAVAILABLE_ERROR } from "~/server/mylessons";
import { RateLimitAcceptance, handleRateLimit } from "../../ratelimit";
import {
    generateDefaultHeaders,
    authHeaderOrQuery,
    setErrorResponse,
    hasInvalidAuthentication,
    hasPasswordResetLocationSet,
    schoolFromRequest,
    BasicResponse,
    STATIC_STRINGS
} from "../../utils";
import { hasInvalidSidRedirect } from "~/server/failsafe";
import { SchemaEntryConsumer, validateBodyNew } from "~/server/validator";

const bodySchema: SchemaEntryConsumer = {
    action: { type: "string", required: true, pattern: /^(done|undone)$/ },
    id: { type: "number", required: true, min: 1, max: 100000 },
    lesson: { type: "number", required: true, min: 1, max: 1000 }
};

export default defineEventHandler<Promise<BasicResponse>>(async (event) => {
    const { req, res } = event.node;
    const address = getRequestIP(event, { xForwardedFor: true });

    if (req.headers["content-type"] !== "application/json") return setErrorResponse(res, 400, "Expected 'application/json' as 'content-type' header");

    const body = await readBody<{ action: "done" | "undone"; id: number; lesson: number }>(event);
    const bodyValidation = validateBodyNew(bodySchema, body);
    if (bodyValidation.violations > 0 || bodyValidation.invalid) return setErrorResponse(res, 400, bodyValidation);

    const token = authHeaderOrQuery(event);
    if (token === null) return setErrorResponse(res, 400, STATIC_STRINGS.INVALID_TOKEN);

    const rateLimit = handleRateLimit("/api/mylessons/homework.post", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { action, id, lesson } = body;

    try {
        const response = await fetch("https://start.schulportal.hessen.de/meinunterricht.php", {
            headers: {
                Cookie: `sid=${token}; ${schoolFromRequest(event)}`,
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest",
                ...generateDefaultHeaders(address)
            },
            body: `a=sus_homeworkDone&id=${id}&entry=${lesson}&b=${action}`,
            redirect: "manual",
            method: "POST"
        });

        if (hasInvalidSidRedirect(response)) return setErrorResponse(res, 403, "Route gesperrt");
        if (hasInvalidAuthentication(response)) return setErrorResponse(res, 401);
        if (hasPasswordResetLocationSet(response)) return setErrorResponse(res, 418, "Lege dein Passwort fest");

        const text = await response.text();
        // This is the restrictor that occurs when the class is hidden for the user
        if (text.includes(COURSE_UNAVAILABLE_ERROR)) return setErrorResponse(res, 403, "Class not available for user");
        // There is no other way to check - so if the request
        // ACTUALLY succeeded we have no real way of knowing
        // For example: If the lesson doesn't even exist or has
        // no homework set to it, is already done or undone, the
        // response does not tell us that.
        return { error: text !== "1" };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
