import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { BasicResponse, generateDefaultHeaders, patterns, setErrorResponseEvent, STATIC_STRINGS } from "../../utils";
import { generateMoodleURL, lookupSchoolMoodle, transformMoodleConversation } from "../../moodle";
import { SchemaEntryConsumer, validateQueryNew } from "~/server/validator";
import { MoodleConversation, PreMoodleConversation } from "~/common/moodle";

const querySchema: SchemaEntryConsumer = {
    session: { required: true, size: 10, pattern: patterns.MOODLE_SESSION },
    cookie: { required: true, size: 26, pattern: patterns.MOODLE_COOKIE },
    school: { required: true, type: "number", min: 1, max: 9999 },
    user: { required: true, type: "number", min: 1 },
    type: { required: false, pattern: /^(favorites|groups)$/ }
};

interface Response extends BasicResponse {
    conversations: MoodleConversation[];
}

const rlHandler = defineRateLimit({ interval: 15, allowed_per_interval: 3 });
export default defineEventHandler<Promise<Response>>(async (event) => {
    const query = getQuery<{ [key: string]: string }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponseEvent(event, 400, queryValidation);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);
    const address = getRequestAddress(event);

    const { session, cookie, school, user, type } = query;

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
                conversations: PreMoodleConversation[];
            } = json[0].data;

            return { error: false, conversations: data.conversations.map((conversation) => transformMoodleConversation(conversation)) };
        }

        return setErrorResponseEvent(event, 401);
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
