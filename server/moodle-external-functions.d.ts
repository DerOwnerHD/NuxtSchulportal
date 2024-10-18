import {
    MoodleConversationTypeFilter,
    MoodleCoursesListClassification,
    PreMoodleConversation,
    PreMoodleConversationMember,
    PreMoodleConversationMessage,
    PreMoodleCourse,
    PreMoodleEvent,
    PreMoodleNotification
} from "~/common/moodle";

/**
 * In its backend, Moodle calls so called External Functions when dealing with requests to /lib/ajax/service.php
 *
 * These are differenciated using the field methodname and multiple can be listed in one request.
 */
interface BaseMoodleExternalFunction {
    name: string;
    args: Record<string, any>;
    response: Record<string, any> | Array<Record<string, any>>;
}

/**
 * External functions, when added, have to be registered in this type!
 */
type MoodleExternalFunctions =
    | Course_EnrolledCoursesByTimelineClassification_ExternalFunction
    | Calendar_GetActionEventsByTimesort_ExternalFunction
    | Message_GetConversations_ExternalFunction
    | Session_TimeRemaining_ExternalFunction
    | Message_GetConversationMessages_ExternalFunction
    | MessagePopup_GetPopupNotifications_ExternalFunction
    | Message_MarkAllNotificationsAsRead_ExternalFunction;

/**
 * Implemented at: https://github.com/moodle/moodle/blob/dca18ebca3b1efe46e02302906c2f2e7fa0e5e0e/course/externallib.php#L3935
 */
export interface Course_EnrolledCoursesByTimelineClassification_ExternalFunction extends BaseMoodleExternalFunction {
    name: "core_course_get_enrolled_courses_by_timeline_classification";
    args: {
        classification: MoodleCoursesListClassification;
        limit: number;
        offset: number;
        sort?: string | null;
        customfieldname?: string | null;
        customfieldvalue?: string | null;
        requiredfields?: string[];
    };
    response: {
        courses: PreMoodleCourse[];
        /**
         * The offset a next request should give. Computed by the entered offset + the processed amount.
         */
        nextoffset: number;
    };
}
/**
 * Implemented at: https://github.com/moodle/moodle/blob/fc29adddf96b42d07bd1e36377172a2352b8ea3d/calendar/externallib.php#L432
 */
export interface Calendar_GetActionEventsByTimesort_ExternalFunction extends BaseMoodleExternalFunction {
    name: "core_calendar_get_action_events_by_timesort";
    args: {
        /** Defaults to 0, either this or timesortto is required */
        timesortfrom: number | null;
        /** Defaults to null, either this or timesortfrom is required */
        timesortto: number | null;
        /** Defaults to 0 */
        aftereventid?: number;
        /** Defaults to 20, values between 1 and 50 accepted */
        limitnum: number;
        /** Defaults to false */
        limittonunsuspendedevents: boolean;
        /** Defaults to null, will be inferred by session */
        userid?: number;
        /** Defaults to null */
        searchvalue?: string;
    };
    response: {
        events: PreMoodleEvent[];
    };
}

/**
 * Implemented at: https://github.com/moodle/moodle/blob/f3189c1e1ac30c2a4863f937bbee854accf57d11/message/externallib.php#L1336
 */
export interface Message_GetConversations_ExternalFunction extends BaseMoodleExternalFunction {
    name: "core_message_get_conversations";
    args: {
        /** Required */
        userid: number;
        /** Defaults to 0 */
        limitfrom: number;
        /** Defaults to 0 */
        limitnum: number;
        /**
         * Defaults to null
         */
        type?: MoodleConversationTypeFilter;
        /**
         * Whether to restrict the results to contain NO favourits conversations (false),
         * ONLY favourite conversation (true),
         * or ignore any restriction altogether (null)
         *
         * Defaults to null
         */
        favourites?: boolean | null;
        /**
         * Whether to include self-conversations (true) or
         * ONLY private conversations (false) when private conversations are requested.
         *
         * Defaults to false
         */
        mergeself: boolean;
    };
    response: {
        conversations: PreMoodleConversation[];
    };
}

/**
 * Implemented at https://github.com/moodle/moodle/blob/a3cc26f8bb8a9422a4b5a0ef3ff5f3551830d724/lib/classes/session/external.php#L84
 */
export interface Session_TimeRemaining_ExternalFunction extends BaseMoodleExternalFunction {
    name: "core_session_time_remaining";
    args: {};
    response: {
        userid: number;
        /** Number of seconds left */
        timeremaining: number;
    };
}

/**
 * Implemented at: https://github.com/moodle/moodle/blob/fc29adddf96b42d07bd1e36377172a2352b8ea3d/message/externallib.php#L1713
 */
export interface Message_GetConversationMessages_ExternalFunction extends BaseMoodleExternalFunction {
    name: "core_message_get_conversation_messages";
    args: {
        currentuserid: number;
        convid: number;
        /** Defaults to 0 */
        limitfrom?: number;
        /** Defaults to 0 */
        limitnum?: number;
        /**
         * Newest messages get returned first.
         *
         * Defaults to false
         */
        newest?: boolean;
        /**
         * The timestamp from which the messages were created
         */
        timefrom?: number;
    };
    response: {
        id: number;
        members: PreMoodleConversationMember[];
        messages: PreMoodleConversationMessage[];
    };
}

export interface MessagePopup_GetPopupNotifications_ExternalFunction extends BaseMoodleExternalFunction {
    name: "message_popup_get_popup_notifications";
    args: {
        /**
         * the user id who received the message, 0 for current user
         */
        useridto: number;
        /** Defaults to true */
        newestfirst?: boolean;
        /** Defaults to 0 */
        limit?: number;
        /** Defaults to 0 */
        offset?: number;
    };
    response: {
        notifications: PreMoodleNotification[];
        unreadcount: number;
    };
}

/**
 * Implemented at: https://github.com/moodle/moodle/blob/fc29adddf96b42d07bd1e36377172a2352b8ea3d/message/externallib.php#L2232
 */
export interface Message_MarkAllNotificationsAsRead_ExternalFunction {
    name: "core_message_mark_all_notifications_as_read";
    args: {
        /**
         * Required, 0 for all users (not allowed for default users)
         */
        useridto: number;
        /**
         * Which user sent the notification, 0 for all. -10 or -20 for support and no-reply
         */
        useridfrom?: number;
        /**
         * Mark messages created before this timestamp as read, 0 to mark all
         */
        timecreatedto?: number;
    };
    response: boolean;
}
