import { defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { BasicResponse, patterns, setErrorResponseEvent, STATIC_STRINGS } from "../../utils";
import { createMoodleRequest, getMoodleErrorResponseCode, lookupSchoolMoodle, transformMoodleConversation } from "../../moodle";
import { SchemaEntryConsumer, validateQueryNew } from "~/server/validator";
import { MoodleConversation, MoodleConversationTypeFilter } from "~/common/moodle";
import { Message_GetConversations_ExternalFunction } from "~/server/moodle-external-functions";

const querySchema: SchemaEntryConsumer = {
    session: { required: true, size: 10, pattern: patterns.MOODLE_SESSION },
    cookie: { required: true, size: 26, pattern: patterns.MOODLE_COOKIE },
    school: { required: true, type: "number", min: 1, max: 9999 },
    user: { required: true, type: "number", min: 1 },
    favorites: { required: false, type: "boolean" },
    type: { required: false, pattern: /^(personal|groups|self)$/ }
};

interface Response extends BasicResponse {
    conversations: MoodleConversation[];
}

const typeTransforms: Record<string, MoodleConversationTypeFilter> = {
    personal: 1,
    group: 2,
    self: 3
};

const rlHandler = defineRateLimit({ interval: 10, allowed_per_interval: 4 });
export default defineEventHandler<Promise<Response>>(async (event) => {
    const query = getQuery<Record<string, string>>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponseEvent(event, 400, queryValidation);

    const rl = rlHandler(event);
    if (rl !== null) return rl;
    const address = getRequestAddress(event);

    const { session, cookie, school, user, type, favorites } = query;

    try {
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponseEvent(event, 404, STATIC_STRINGS.MOODLE_SCHOOL_NOT_EXIST);

        const response = await createMoodleRequest<Message_GetConversations_ExternalFunction>(
            { school, cookie, session, address },
            {
                name: "core_message_get_conversations",
                args: {
                    userid: parseInt(user),
                    limitfrom: 0,
                    limitnum: 0,
                    type: type ? typeTransforms[type as "personal" | "group" | "self"] : typeTransforms.personal,
                    favourites: favorites === "true" || favorites === "1" ? true : null,
                    mergeself: true
                }
            }
        );

        const { error, error_details, data } = response[0];

        if (error) return setErrorResponseEvent(event, getMoodleErrorResponseCode(error_details), error_details);
        return { error: false, conversations: data.conversations.map(transformMoodleConversation) };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
