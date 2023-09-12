import { RateLimitAcceptance, handleRateLimit } from "../../ratelimit";
import { generateDefaultHeaders, patterns, setErrorResponse, transformEndpointSchema, validateQuery } from "../../utils";
import { MoodleConversation, lookupSchoolMoodle, transformMoodleConversation } from "../../moodle";

const schema = {
    query: {
        session: { required: true, length: 10, pattern: patterns.MOODLE_SESSION },
        cookie: { required: true, length: 26, pattern: patterns.MOODLE_COOKIE },
        paula: { required: true, length: 64, pattern: patterns.HEX_CODE },
        school: { required: true, type: "number", min: 1, max: 9999 },
        user: { required: true, type: "number", min: 1 }
    }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const query = getQuery(event);

    const valid = validateQuery(query, schema.query);
    if (!valid) return setErrorResponse(res, 400, transformEndpointSchema(schema));

    const rateLimit = handleRateLimit("/api/moodle/conversations.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { session, cookie, paula, school, user } = query;

    try {
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponse(res, 404, "Moodle doesn't exist for given school");

        const response = await fetch(`https://mo${school}.schule.hessen.de/lib/ajax/service.php?sesskey=${session}`, {
            method: "POST",
            headers: {
                Cookie: `MoodleSession=${cookie?.toString()}; Paula=${paula?.toString()}`,
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
                        timesortfrom: Math.floor(Date.now() / 1000) - (60 * 60 * 24 * 7)
                    }
                }
            ])
        });

        const json = await response.json();
        if (!json[0].error) return { error: false, events: json[0].data?.events || [] };

        return setErrorResponse(res, 401);
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
