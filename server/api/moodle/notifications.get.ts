import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { BasicResponse, patterns, setErrorResponseEvent, STATIC_STRINGS } from "../../utils";
import { createMoodleRequest, getMoodleErrorResponseCode, lookupSchoolMoodle, transformMoodleNotification } from "../../moodle";
import { SchemaEntryConsumer, validateQueryNew } from "~/server/validator";
import { MoodleNotification } from "~/common/moodle";
import { MessagePopup_GetPopupNotifications_ExternalFunction } from "~/server/moodle-external-functions";

const querySchema: SchemaEntryConsumer = {
    session: { required: true, size: 10, pattern: patterns.MOODLE_SESSION },
    cookie: { required: true, size: 26, pattern: patterns.MOODLE_COOKIE },
    school: { required: true, type: "number", min: 1, max: 9999 }
};

interface Response extends BasicResponse {
    notifications: MoodleNotification[];
}

const rlHandler = defineRateLimit({ interval: 15, allowed_per_interval: 3 });
export default defineEventHandler<Promise<Response>>(async (event) => {
    const query = getQuery<{ session: string; cookie: string; school: string; user: string }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponseEvent(event, 400, queryValidation);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);
    const address = getRequestAddress(event);

    const { session, cookie, school } = query;

    try {
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponseEvent(event, 404, STATIC_STRINGS.MOODLE_SCHOOL_NOT_EXIST);

        const response = await createMoodleRequest<MessagePopup_GetPopupNotifications_ExternalFunction>(
            { school, cookie, session, address },
            {
                name: "message_popup_get_popup_notifications",
                args: {
                    useridto: 0,
                    newestfirst: true
                }
            }
        );

        const { error, error_details, data } = response[0];

        if (error) return setErrorResponseEvent(event, getMoodleErrorResponseCode(error_details), error_details);
        return { error: false, notifications: data.notifications.map(transformMoodleNotification) };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
