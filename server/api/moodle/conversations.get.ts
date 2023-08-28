import { lookup } from "dns/promises";
import { RateLimitAcceptance, handleRateLimit } from "../../ratelimit";
import { generateDefaultHeaders, patterns, setErrorResponse, validateQuery } from "../../utils";
import { MoodleConversation, transformMoodleConversation } from "../../moodle";

const schema = {
    query: {
        session: { required: true, length: 10 },
        cookie: { required: true, length: 26 },
        paula: { required: true, length: 64 },
        school: { required: true, type: "number", min: 1, max: 9999 },
        user: { required: true, type: "number", min: 1 }
    }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const query = getQuery(event);

    const valid = validateQuery(query, schema.query);
    if (
        !valid ||
        !patterns.HEX_CODE.test(query.paula?.toString() || "") ||
        !patterns.MOODLE_SESSION.test(query.session?.toString() || "") ||
        !patterns.MOODLE_COOKIE.test(query.cookie?.toString() || "")
    )
        return setErrorResponse(res, 400, schema);

    const rateLimit = handleRateLimit("/api/moodle/conversations.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { session, cookie, paula, school, user } = query;

    try {
        try {
            await lookup(`mo${school}.schule.hessen.de`);
        } catch (error) {
            return setErrorResponse(res, 404, "Moodle doesn't exist for given school");
        }

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
                    methodname: "core_message_get_conversations",
                    args: {
                        favourites: false,
                        limitfrom: 0,
                        limitnum: 51,
                        mergeself: true,
                        type: 1,
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
