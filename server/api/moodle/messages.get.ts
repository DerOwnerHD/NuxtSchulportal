import { lookup } from "dns/promises";
import { RateLimitAcceptance, handleRateLimit } from "../../ratelimit";
import { patterns, setErrorResponse, validateQuery } from "../../utils";
import { MoodleConversationMember, MoodleConversationMessage, transformMoodleMember, transformMoodleMessage } from "../../moodle";

const schema = [
    {
        method: "GET",
        query: {
            session: { required: true, length: 10 },
            cookie: { required: true, length: 26 },
            paula: { required: true, length: 64 },
            school: { required: true, type: "number", min: 1, max: 9999 },
            user: { required: true, type: "number", min: 1 },
            conversation: { required: true, type: "number", min: 1 }
        }
    }
];

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const query = getQuery(event);
    
    const valid = validateQuery(query, schema.find((x) => x.method === "GET")?.query!);
    if (
        !valid || 
        !patterns.HEX_CODE.test(query.paula?.toString() || "") || 
        !patterns.MOODLE_SESSION.test(query.session?.toString() || "") ||
        !patterns.MOODLE_COOKIE.test(query.cookie?.toString() || "")
    ) return setErrorResponse(res, 400, schema);

    const { session, cookie, paula, school, user, conversation } = query;

    const rateLimit = handleRateLimit("/api/moodle/messages.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    try {

        try {
            await lookup(`mo${school}.schule.hessen.de`);
        } catch (error) {
            return setErrorResponse(res, 404, "Moodle doesn't exist for given school");
        }

        const response = await fetch(`https://mo${ school }.schule.hessen.de/lib/ajax/service.php?sesskey=${ session }`, {
            method: "POST",
            headers: {
                Cookie: `MoodleSession=${ cookie?.toString() }; Paula=${ paula?.toString() }`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify([
                { 
                    index: 0,
                    methodname: "core_message_get_conversation_messages",
                    args: {
                        convid: parseInt(conversation?.toString() || "0"),
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