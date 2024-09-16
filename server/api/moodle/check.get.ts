import { generateDefaultHeaders, patterns, setErrorResponse, STATIC_STRINGS } from "../../utils";
import { handleRateLimit, RateLimitAcceptance } from "../../ratelimit";
import { generateMoodleURL, lookupSchoolMoodle } from "../../moodle";
import { SchemaEntryConsumer, validateQueryNew } from "~/server/validator";

const querySchema: SchemaEntryConsumer = {
    session: { required: true, size: 10, pattern: patterns.MOODLE_SESSION },
    cookie: { required: true, size: 26 },
    school: { required: true, type: "number", min: 1, max: 9999 }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = getRequestIP(event, { xForwardedFor: true });

    const query = getQuery<{ [key: string]: string }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponse(res, 400, queryValidation);

    const rateLimit = handleRateLimit("/api/moodle/check.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { session, cookie, school } = query;

    try {
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponse(res, 404, STATIC_STRINGS.MOODLE_SCHOOL_NOT_EXIST);

        const response = await fetch(`${generateMoodleURL(school)}/lib/ajax/service.php?sesskey=${session}`, {
            method: "POST",
            headers: {
                Cookie: `MoodleSession=${cookie}`,
                "Content-Type": "application/json",
                ...generateDefaultHeaders(address)
            },
            body: JSON.stringify([
                {
                    index: 0,
                    methodname: "core_session_time_remaining",
                    args: {}
                }
            ])
        });

        const json = await response.json();
        return {
            error: false,
            valid: !json[0].error,
            user: json[0].data?.userid || null,
            remaining: json[0].data?.timeremaining || null
        };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
