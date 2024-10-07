import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { generateDefaultHeaders, patterns, setErrorResponseEvent, STATIC_STRINGS } from "../../utils";
import { generateMoodleURL, lookupSchoolMoodle, transformMoodleMember, transformMoodleMessage } from "../../moodle";
import { SchemaEntryConsumer, validateQueryNew } from "~/server/validator";
import { PreMoodleConversationMember, PreMoodleConversationMessage } from "~/common/moodle";

const querySchema: SchemaEntryConsumer = {
    session: { required: true, size: 10, pattern: patterns.MOODLE_SESSION },
    cookie: { required: true, size: 26, pattern: patterns.MOODLE_COOKIE },
    school: { required: true, type: "number", min: 1, max: 9999 },
    user: { required: true, type: "number", min: 1 },
    conversation: { required: true, type: "number", min: 1 }
};

const rlHandler = defineRateLimit({ interval: 15, allowed_per_interval: 4 });
export default defineEventHandler(async (event) => {
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
                    methodname: "core_message_get_conversation_messages",
                    args: {
                        convid: parseInt(conversation),
                        limitfrom: 1,
                        limitnum: 101,
                        newest: true,
                        currentuserid: user
                    }
                }
            ])
        });

        const json = await response.json();
        if (!json[0].error) {
            const data: {
                id: number;
                members: PreMoodleConversationMember[];
                messages: PreMoodleConversationMessage[];
            } = json[0].data;

            const transformedData = {
                members: data.members.map((member) => transformMoodleMember(member)),
                messages: data.messages.map((message) => transformMoodleMessage(message))
            };

            return { error: false, ...transformedData };
        }

        // Let's hope these error codes are consistent, but who knows
        if (json[0].exception.errorcode === "User is not part of conversation.")
            return setErrorResponseEvent(event, 403, "User is not part of conversation");

        return setErrorResponseEvent(event, 401);
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
