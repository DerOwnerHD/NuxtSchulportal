import { BasicResponse, patterns, setErrorResponseEvent, STATIC_STRINGS } from "../../utils";
import { defineRateLimit, RateLimitAcceptance, getRequestAddress } from "~/server/ratelimit";
import { createMoodleRequest, lookupSchoolMoodle } from "../../moodle";
import { SchemaEntryConsumer, validateQueryNew } from "~/server/validator";
import { Session_TimeRemaining_ExternalFunction } from "~/server/moodle-external-functions";

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

        const response = await createMoodleRequest<Session_TimeRemaining_ExternalFunction>(
            { school, cookie, session, address },
            {
                name: "core_session_external_function",
                args: {}
            }
        );

        const { error, data } = response[0];
        return { error: false, valid: !error, user: data?.userid ?? null, remaining: data?.timeremaining ?? null };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
