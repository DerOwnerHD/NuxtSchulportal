import { defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { BasicResponse, patterns, setErrorResponseEvent, STATIC_STRINGS } from "../../../utils";
import { createMoodleRequest, getMoodleErrorResponseCode, lookupSchoolMoodle } from "../../../moodle";
import { SchemaEntryConsumer, validateQueryNew } from "~/server/validator";
import { Message_MarkAllNotificationsAsRead_ExternalFunction } from "~/server/moodle-external-functions";

const querySchema: SchemaEntryConsumer = {
    session: { required: true, size: 10, pattern: patterns.MOODLE_SESSION },
    cookie: { required: true, size: 26, pattern: patterns.MOODLE_COOKIE },
    school: { required: true, type: "number", min: 1, max: 9999 },
    user: { required: true, type: "number", min: 1, max: 9999 },
    sender: { required: false, type: "number", min: 1, max: 9999 }
};

const rlHandler = defineRateLimit({ interval: 15, allowed_per_interval: 3 });
export default defineEventHandler<Promise<BasicResponse>>(async (event) => {
    const query = getQuery<{ session: string; cookie: string; school: string; user: string; sender: string }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponseEvent(event, 400, queryValidation);

    const rl = rlHandler(event);
    if (rl !== null) return rl;
    const address = getRequestAddress(event);

    const { session, cookie, school, user, sender } = query;

    try {
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponseEvent(event, 404, STATIC_STRINGS.MOODLE_SCHOOL_NOT_EXIST);

        const response = await createMoodleRequest<Message_MarkAllNotificationsAsRead_ExternalFunction>(
            { school, cookie, session, address },
            {
                name: "core_message_mark_all_notifications_as_read",
                args: {
                    useridto: parseInt(user),
                    useridfrom: parseInt(sender)
                }
            }
        );

        const { error, error_details } = response[0];

        if (error) return setErrorResponseEvent(event, getMoodleErrorResponseCode(error_details), error_details);
        return { error: false };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
