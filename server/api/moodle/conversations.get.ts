import { RateLimitAcceptance, handleRateLimit } from "../../ratelimit";
import { generateDefaultHeaders, patterns, setErrorResponse, transformEndpointSchema, validateQuery } from "../../utils";
import { MoodleConversation, lookupSchoolMoodle, transformMoodleConversation } from "../../moodle";

const schema = {
    query: {
        session: { required: true, length: 10, pattern: patterns.MOODLE_SESSION },
        cookie: { required: true, length: 26, pattern: patterns.MOODLE_COOKIE },
        paula: { required: true, length: 64, pattern: patterns.HEX_CODE },
        school: { required: true, type: "number", min: 1, max: 9999 },
        user: { required: true, type: "number", min: 1 },
        type: { required: false, options: ["favorites", "groups"] }
    }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const query = getQuery<{ [key: string]: string }>(event);
    if (!validateQuery(query, schema.query)) return setErrorResponse(res, 400, transformEndpointSchema(schema));

    const rateLimit = handleRateLimit("/api/moodle/conversations.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { session, cookie, paula, school, user, type } = query;

    try {
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponse(res, 404, "Moodle doesn't exist for given school");

        const response = await fetch(`https://mo${school}.schule.hessen.de/lib/ajax/service.php?sesskey=${session}`, {
            method: "POST",
            headers: {
                Cookie: `MoodleSession=${cookie}; Paula=${paula}`,
                "Content-Type": "application/json",
                ...generateDefaultHeaders(address)
            },
            body: JSON.stringify([
                {
                    index: 0,
                    methodname: "core_message_get_conversations",
                    args: {
                        favourites: type === "favorites",
                        limitfrom: 0,
                        limitnum: 51,
                        mergeself: true,
                        type: type === "groups" ? 2 : 1,
                        userid: user
                    }
                }
            ])
        });

        const json = await response.json();
        if (!json[0].error) {
            const data: {
                conversations: MoodleConversation[];
            } = json[0].data;

            const transformedData = {
                conversations: data.conversations.map((conversation) => transformMoodleConversation(conversation))
            };

            return { error: false, ...transformedData };
        }

        return setErrorResponse(res, 401);
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
