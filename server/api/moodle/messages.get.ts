import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { BasicResponse, patterns, setErrorResponseEvent, STATIC_STRINGS } from "../../utils";
import { createMoodleRequest, getMoodleErrorResponseCode, lookupSchoolMoodle, transformMoodleMember, transformMoodleMessage } from "../../moodle";
import { SchemaEntryConsumer, validateQueryNew } from "~/server/validator";
import { Message_GetConversationMessages_ExternalFunction } from "~/server/moodle-external-functions";
import { MoodleConversationMember, MoodleConversationMessage } from "~/common/moodle";

const querySchema: SchemaEntryConsumer = {
    session: { required: true, size: 10, pattern: patterns.MOODLE_SESSION },
    cookie: { required: true, size: 26, pattern: patterns.MOODLE_COOKIE },
    school: { required: true, type: "number", min: 1, max: 9999 },
    user: { required: true, type: "number", min: 1, max: 10_000 },
    conversation: { required: true, type: "number", min: 1, max: 1_000_000 }
};

interface Response extends BasicResponse {
    members: MoodleConversationMember[];
    messages: MoodleConversationMessage[];
}

const rlHandler = defineRateLimit({ interval: 15, allowed_per_interval: 4 });
export default defineEventHandler<Promise<Response>>(async (event) => {
    const query = getQuery<{ [key: string]: string }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponseEvent(event, 400, queryValidation);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);
    const address = getRequestAddress(event);

    const { session, cookie, school, user, conversation } = query;

    try {
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponseEvent(event, 404, STATIC_STRINGS.MOODLE_SCHOOL_NOT_EXIST);

        const response = await createMoodleRequest<Message_GetConversationMessages_ExternalFunction>(
            { school, cookie, session, address },
            {
                name: "core_message_get_conversation_messages",
                args: {
                    currentuserid: parseInt(user),
                    convid: parseInt(conversation),
                    limitfrom: 0,
                    limitnum: 0,
                    newest: true
                }
            }
        );

        const { error, error_details, data } = response[0];

        if (error) {
            if (error_details === "User is not part of conversation.") return setErrorResponseEvent(event, 403, "Not part of conversation");
            return setErrorResponseEvent(event, getMoodleErrorResponseCode(error_details), error_details);
        }

        if (data.id !== parseInt(conversation)) throw new Error("Incorrect conv ID received from Moodle");

        return { error: false, members: data.members.map(transformMoodleMember), messages: data.messages.map(transformMoodleMessage) };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
