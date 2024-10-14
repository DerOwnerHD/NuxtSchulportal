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
    MoodleConversationMessage
} from "~/common/moodle";
import { generateDefaultHeaders, patterns } from "./utils";
import { MoodleExternalFunctions } from "./moodle-external-functions";

interface RequiredUserCredentials {
    school: string;
    cookie: string;
    session: string;
    address: string | null;
}

interface ExternalFunctionResponse<T extends MoodleExternalFunctions> {
    error: boolean;
    data: T["response"];
    exception: {
        message: string;
        errorcode: string;
        link: string;
        moreinfourl: string;
    };
}

/**
 * If an error in parsing the request, i.e. invalid JSON, occured, not every single request is answered (so no array return value).
 *
 * This is not the same as when a session expires. That error is handled for every single method.
 */
interface GlobalMoodleResponseError {
    error: string;
    errorcode: string;
    /** In production enviroments always nulled */
    stacktrace: null;
    /** In production enviroments always nulled */
    debuginfo: null;
    /** In production enviroments always nulled */
    reproductionlink: null;
}

const METHOD_UNAUTHORIZED_CODES = ["servicerequireslogin", "invalidsesskey"];
const METHOD_FORBIDDEN_CODES = ["servicenotavailable"];

export function getMoodleErrorResponseCode(errorcode: string) {
    if (METHOD_FORBIDDEN_CODES.includes(errorcode)) return 403;
    else if (METHOD_UNAUTHORIZED_CODES.includes(errorcode)) return 401;
    return 400;
}

type MoodleResponse<T extends MoodleExternalFunctions> =
    | {
          error: true;
          error_details: any;
          data: null;
      }
    | {
          error: false;
          error_details: undefined;
          data: T["response"];
      };

/**
 * Fields the caller should provide for createMoodleRequest.
 */
type ExternalFunctionRequiredFields<T extends MoodleExternalFunctions> = { name: T["name"]; args: T["args"] };

/**
 * Performs a Moodle service API call with the given functions to call.
 *
 * These functions are from authenticated (service.php) APIs, not unauthed (service-nologin.php).
 *
 * Multiple functions can be added to one request and will be returned in that order.
 * @param param0 Authentication details for the user
 * @param methods A chain of method calls to be added to the request
 */
export async function createMoodleRequest<T extends MoodleExternalFunctions>(
    { school, cookie, session, address }: RequiredUserCredentials,
    ...methods: ExternalFunctionRequiredFields<T>[]
): Promise<MoodleResponse<T>[]> {
    function errorOutAllMethods(reason?: any) {
        return methods.map(() => ({ error: true as true, error_details: reason, data: null }));
    }

    try {
        const response = await fetch(`${generateMoodleURL(school)}/lib/ajax/service.php?sesskey=${session}`, {
            method: "POST",
            headers: {
                Cookie: `MoodleSession=${cookie}`,
                "Content-Type": "application/json",
                ...generateDefaultHeaders(address)
            },
            body: buildMoodleRequestBody(...methods)
        });

        if (!patterns.JSON_CHARSET_MIME_TYPE.test(response.headers.get("Content-Type")!)) {
            return errorOutAllMethods("Invalid MIME type");
        }

        const data = await response.json();

        // Ensure the response is an array and matches the number of methods in the request
        if (!Array.isArray(data) || data.length !== methods.length) {
            return errorOutAllMethods((data as GlobalMoodleResponseError).errorcode);
        }

        // Map each response to the corresponding method and ensure correct typing
        const methodResponses: MoodleResponse<T>[] = methods.map((_, index) => {
            const response = data[index] as ExternalFunctionResponse<T>;

            if (response.error) {
                return {
                    error: true,
                    error_details: response.exception?.errorcode ?? null,
                    data: null
                };
            }

            return {
                error: false,
                error_details: undefined,
                data: response.data
            };
        });

        return methodResponses;
    } catch (error) {
        // Catch any other errors and map to the correct error structure
        return errorOutAllMethods(error);
    }
}

function buildMoodleRequestBody<T extends MoodleExternalFunctions>(...methods: ExternalFunctionRequiredFields<T>[]) {
    return JSON.stringify(
        methods.map((method, index) => ({
            index,
            methodname: method.name,
            args: method.args
        }))
    );
}

export function transformMoodleMember(member: PreMoodleConversationMember): MoodleConversationMember {
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
}

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
export function generateMoodleURL(school: any, withoutProtocol: boolean = false): string {
    if (!/^\d+$/.test(school)) throw new Error("An invalid school was provided to generateMoodleURL and was not validated properly!!");
    return `${withoutProtocol ? "" : "https://"}mo${school}.${BASE_MOODLE_URL}`;
}
