import { BasicResponse, generateDefaultHeaders, patterns, setErrorResponseEvent, STATIC_STRINGS } from "../../utils";
import { defineRateLimit, RateLimitAcceptance, getRequestAddress } from "~/server/ratelimit";
import { generateMoodleURL, lookupSchoolMoodle } from "../../moodle";
import { SchemaEntryConsumer, validateQueryNew } from "~/server/validator";

const querySchema: SchemaEntryConsumer = {
    session: { required: true, size: 10, pattern: patterns.MOODLE_SESSION },
    cookie: { required: true, size: 26 },
    school: { required: true, type: "number", min: 1, max: 9999 }
};

interface Response extends BasicResponse {
    valid: boolean;
    user: number | null;
    remaining: number | null;
}

const rlHandler = defineRateLimit({ interval: 10, allowed_per_interval: 4 });
export default defineEventHandler<Promise<Response>>(async (event) => {
    const query = getQuery<{ [key: string]: string }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponseEvent(event, 400, queryValidation);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);
    const address = getRequestAddress(event);

    const { session, cookie, school } = query;

    try {
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponseEvent(event, 404, STATIC_STRINGS.MOODLE_SCHOOL_NOT_EXIST);

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
            user: json[0].data?.userid ?? null,
            remaining: json[0].data?.timeremaining ?? null
        };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
