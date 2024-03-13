import { RateLimitAcceptance, handleRateLimit } from "../../ratelimit";
import { APIError, generateDefaultHeaders, patterns, setErrorResponse, transformEndpointSchema, validateQuery } from "../../utils";
import { MoodleEvent, generateMoodleURL, lookupSchoolMoodle, transformMoodleEvent } from "../../moodle";

const schema = {
    query: {
        session: { required: true, length: 10, pattern: patterns.MOODLE_SESSION },
        cookie: { required: true, length: 26, pattern: patterns.MOODLE_COOKIE },
        school: { required: true, type: "number", min: 1, max: 9999 }
    }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const query = getQuery<{ [key: string]: string }>(event);
    if (!validateQuery(query, schema.query)) return setErrorResponse(res, 400, transformEndpointSchema(schema));

    const rateLimit = handleRateLimit("/api/moodle/events.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { session, cookie, school } = query;

    try {
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponse(res, 404, "Moodle doesn't exist for given school");

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
                    methodname: "core_calendar_get_action_events_by_timesort",
                    args: {
                        limitnum: 3,
                        limittononsuspendedevents: true,
                        timesortfrom: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 7
                    }
                }
            ])
        });

        const json = await response.json();
        if (!json[0].error) {
            const { events } = json[0].data;
            if (!events) throw new APIError("Events property not present even though there is no error", false);
            return { error: false, events: events.map((event: MoodleEvent) => transformMoodleEvent(event)) };
        }

        return setErrorResponse(res, 401);
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
