import { RateLimitAcceptance, handleRateLimit } from "../../ratelimit";
import { generateDefaultHeaders, patterns, setErrorResponse, STATIC_STRINGS } from "../../utils";
import {
    MoodleConversationMember,
    MoodleConversationMessage,
    generateMoodleURL,
    lookupSchoolMoodle,
    transformMoodleMember,
    transformMoodleMessage
} from "../../moodle";
import { SchemaEntryConsumer, validateQueryNew } from "~/server/validator";

const querySchema: SchemaEntryConsumer = {
    session: { required: true, size: 10, pattern: patterns.MOODLE_SESSION },
    cookie: { required: true, size: 26, pattern: patterns.MOODLE_COOKIE },
    school: { required: true, type: "number", min: 1, max: 9999 },
    user: { required: true, type: "number", min: 1 },
    conversation: { required: true, type: "number", min: 1 }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const query = getQuery<{ [key: string]: string }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponse(res, 400, queryValidation);

    const rateLimit = handleRateLimit("/api/moodle/messages.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { session, cookie, school, user, conversation } = query;

    try {
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponse(res, 404, STATIC_STRINGS.MOODLE_SCHOOL_NOT_EXIST);

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
                members: MoodleConversationMember[];
                messages: MoodleConversationMessage[];
            } = json[0].data;

            const transformedData = {
                members: data.members.map((member) => transformMoodleMember(member)),
                messages: data.messages.map((message) => transformMoodleMessage(message))
            };

            return { error: false, ...transformedData };
        }

        // Let's hope these error codes are consistent, but who knows
        if (json[0].exception.errorcode === "User is not part of conversation.")
            return setErrorResponse(res, 403, "User is not part of conversation");

        return setErrorResponse(res, 401);
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
