import { lookup } from "node:dns/promises";
import type {
    PreMoodleConversationMember,
    PreMoodleConversationMessage,
    PreMoodleCourse,
    PreMoodleEvent,
    PreMoodleNotification,
    PreMoodleConversation,
    MoodleConversation,
    MoodleConversationMember,
    MoodleCourse,
    MoodleEvent,
    MoodleNotification,
    MoodleMessage as MoodleConversationMessage
} from "~/common/moodle";

export const transformMoodleMember = (member: PreMoodleConversationMember): MoodleConversationMember => {
    return {
        id: member.id,
        name: member.fullname,
        profile: member.profileurl,
        avatar: { small: member.profileimageurlsmall, default: member.profileimageurl },
        online: member.isonline,
        showStatus: member.showonlinestatus,
        blocked: member.isblocked,
        contact: member.iscontact,
        deleted: member.isdeleted,
        abilities: {
            message: member.canmessage,
            messageIfBlocked: member.canmessageevenifblocked
        },
        requiresContact: member.requirescontact,
        contactRequests: member.contactrequests
    };
};

export function transformMoodleCourse(course: PreMoodleCourse): MoodleCourse {
    return {
        id: course.id,
        category: course.coursecategory,
        image: course.courseimage,
        timestamps: {
            start: course.startdate,
            end: course.enddate
        },
        names: {
            full: course.fullname,
            display: course.fullnamedisplay,
            short: course.shortname
        },
        progress: {
            visible: course.hasprogress,
            percentage: course.progress
        },
        // We just use hidden property and ignore visible (these things
        // are pretty much just the same thing turned around)
        hidden: course.hidden,
        favorite: course.isfavourite,
        exportFont: course.pdfexportfont,
        properties: {
            activityDates: course.showactivitydates,
            completionConditions: course.showcompletionconditions,
            shortName: course.showshortname
        },
        summary: {
            text: course.summary,
            format: course.summaryformat
        },
        link: course.viewurl
    };
}

export function transformMoodleEvent(event: PreMoodleEvent): MoodleEvent {
    return {
        id: event.id,
        name: event.name,
        description: {
            text: event.description,
            format: event.descriptionformat
        },
        location: event.location,
        category: event.categoryid,
        user: event.userid,
        repeat: event.repeatid,
        count: event.eventcount,
        type: event.eventtype,
        instance: event.instance,
        activity: {
            name: event.activityname,
            description: event.activitystr
        },
        timestamps: {
            start: event.timestart,
            modified: event.timemodified,
            midnight: event.timeusermidnight,
            duration: event.timeduration,
            sort: event.timesort
        },
        visible: !!event.visible,
        overdue: event.overdue,
        icon: {
            key: event.icon.key,
            component: event.icon.component,
            alt: event.icon.alttext,
            url: event.icon.iconurl,
            class: event.icon.iconclass
        },
        course: transformMoodleCourse(event.course),
        abilities: {
            edit: event.canedit,
            delete: event.candelete
        },
        links: {
            edit: event.editurl,
            delete: event.deleteurl,
            view: event.viewurl
        },
        formatted: {
            time: event.formattedtime,
            location: event.formattedlocation
        }
    };
}

export function transformMoodleNotification(notification: PreMoodleNotification): MoodleNotification {
    return {
        id: notification.id,
        author: notification.useridfrom,
        subject: notification.subject,
        message: {
            short: notification.text.replace(/<(\/)?([a-z]+)(?![^>]*\/>)[^>]*>/g, ""),
            full:
                notification.fullmessage.split("\n---------------------------------------------------------------------\n")[1] ||
                notification.fullmessage
        },
        read: notification.read,
        deleted: notification.deleted,
        icon: notification.iconurl,
        timestamps: {
            created: notification.timecreated * 1000,
            read: notification.timeread * 1000,
            pretty: notification.timecreatedpretty
        },
        link: notification.contexturl
    };
}

export function transformMoodleMessage(message: PreMoodleConversationMessage): MoodleConversationMessage {
    return {
        id: message.id,
        author: message.useridfrom,
        text: message.text,
        timestamp: message.timecreated * 1000
    };
}

export function transformMoodleConversation(conversation: PreMoodleConversation): MoodleConversation {
    return {
        id: conversation.id,
        name: conversation.name,
        subname: conversation.subname,
        icon: conversation.imageurl,
        type: conversation.type,
        memberCount: conversation.membercount,
        muted: conversation.ismuted,
        favorite: conversation.isfavourite,
        // We assume the client just figures out whether it's
        // read by the count in this property instead of "isread"
        unread: conversation.unreadcount ?? 0,
        members: conversation.members.map((member) => transformMoodleMember(member)),
        messages: conversation.messages.map((message) => transformMoodleMessage(message)),
        canDeleteMessagesForEveryone: conversation.candeletemessagesforallusers
    };
}

export async function lookupSchoolMoodle(school: any): Promise<boolean> {
    try {
        await lookup(generateMoodleURL(school, true));
        return true;
    } catch {
        return false;
    }
}

const BASE_MOODLE_URL = useRuntimeConfig().public.baseMoodleURL;
/**
 * Generates a Moodle URL for Schulportal.
 * May change dynamically based on updates.
 * @param school The school ID (xxxx)
 * @param withoutProtocol Whether the HTTPS protocol should be included (only needed for DNS lookup)
 * @returns The generated URL
 */
export const generateMoodleURL = (school: any, withoutProtocol: boolean = false): string =>
    `${withoutProtocol ? "" : "https://"}mo${school}.${BASE_MOODLE_URL}`;
