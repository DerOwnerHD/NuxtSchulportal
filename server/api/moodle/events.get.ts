import { defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { patterns, setErrorResponseEvent, STATIC_STRINGS } from "../../utils";
import { createMoodleRequest, getMoodleErrorResponseCode, lookupSchoolMoodle, transformMoodleEvent } from "../../moodle";
import { SchemaEntryConsumer, validateQueryNew } from "~/server/validator";
import { Calendar_GetActionEventsByTimesort_ExternalFunction } from "~/server/moodle-external-functions";

const querySchema: SchemaEntryConsumer = {
    session: { required: true, size: 10, pattern: patterns.MOODLE_SESSION },
    cookie: { required: true, size: 26, pattern: patterns.MOODLE_COOKIE },
    school: { required: true, type: "number", min: 1, max: 9999 }
};

const rlHandler = defineRateLimit({ interval: 10, allowed_per_interval: 3 });
export default defineEventHandler(async (event) => {
    const query = getQuery<{ [key: string]: string }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponseEvent(event, 400, queryValidation);

    const rl = rlHandler(event);
    if (rl !== null) return rl;
    const address = getRequestAddress(event);

    const { session, cookie, school } = query;

    try {
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponseEvent(event, 404, STATIC_STRINGS.MOODLE_SCHOOL_NOT_EXIST);

        const response = await createMoodleRequest<Calendar_GetActionEventsByTimesort_ExternalFunction>(
            { school, cookie, session, address },
            {
                name: "core_calendar_get_action_events_by_timesort",
                args: {
                    timesortfrom: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 7,
                    timesortto: null,
                    limitnum: 10,
                    limittonunsuspendedevents: true
                }
            }
        );

        const { error, error_details, data } = response[0];
        if (error) return setErrorResponseEvent(event, getMoodleErrorResponseCode(error_details), error_details);
        return { error: false, events: data.events.map(transformMoodleEvent) };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
