import { lookup } from "dns/promises";

export interface MoodleConversationMember {
    id: number;
    fullname: string;
    profileurl: string;
    profileimageurl: string;
    profileimageurlsmall: string;
    isonline: boolean | null;
    showonlinestatus: boolean;
    isblocked: boolean;
    iscontact: boolean;
    isdeleted: boolean;
    canmessageevenifblocked: boolean | null;
    canmessage: boolean | null;
    requirescontact: boolean | null;
    contactrequests: [];
}

export interface MoodleCourse {
    coursecategory: string;
    courseimage: string;
    enddate: number;
    fullname: string;
    fullnamedisplay: string;
    hasprogress: boolean;
    hidden: boolean;
    id: number;
    idnumber: string;
    isfavourite: boolean;
    pdfexportfont: string;
    progress: number;
    shortname: string;
    showactivitydates: boolean;
    showcompletionconditions: boolean;
    showshortname: boolean;
    startdate: number;
    summary: string;
    summaryformat: number;
    viewurl: string;
    visible: boolean;
}

export interface MoodleConversationMessage {
    id: number;
    useridfrom: number;
    text: string;
    timecreated: number;
}

export interface MoodleConversation {
    id: number;
    name: string;
    subname: string | null;
    imageurl: string | null;
    type: number;
    membercount: number;
    ismuted: boolean;
    isfavourite: boolean;
    isread: boolean;
    unreadcount: number | null;
    members: MoodleConversationMember[];
    messages: MoodleConversationMessage[];
    candeletemessagesforallusers: boolean;
}

export interface MoodleEvent {
    action: {
        actionable: boolean;
        itemcount: number;
        name: string;
        showitemcount: boolean;
        url: string;
    };
    activityname: string;
    activitystr: string;
    candelete: boolean;
    canedit: boolean;
    categoryid: number | null;
    component: string;
    course: MoodleCourse;
    deleteurl: string;
    description: string;
    descriptionformat: number;
    editurl: string;
    eventcount: number | null;
    eventtype: string;
    formattedlocation: string;
    formattedtime: string;
    groupid: number | null;
    groupname: string | null;
    icon: {
        alttext: string;
        component: string;
        iconclass: string;
        iconurl: string;
        key: string;
    };
    id: number;
    instance: number;
    isactionevent: boolean;
    iscategoryevent: boolean;
    iscourseevent: boolean;
    location: string;
    modulename: string;
    name: string;
    normalisedeventtype: string;
    normalisedeventtypetext: string;
    overdue: boolean;
    purpose: string;
    repeatid: number | null;
    subscription: {
        displayeventsource: boolean;
    };
    timeduration: number;
    timemodified: number;
    timesort: number;
    timestart: number;
    timeusermidnight: number;
    url: string;
    userid: number;
    viewurl: string;
    visible: number;
}

export const transformMoodleMember = (member: MoodleConversationMember) => {
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

export const transformMoodleCourse = (course: MoodleCourse) => {
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

export const transformMoodleEvent = (event: MoodleEvent) => {
    return {}
}

export const transformMoodleMessage = (message: MoodleConversationMessage) => {
    return {
        id: message.id,
        author: message.useridfrom,
        text: message.text,
        timestamp: message.timecreated * 1000
    };
};

export const transformMoodleConversation = (conversation: MoodleConversation) => {
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
        unread: conversation.unreadcount,
        members: conversation.members.map((member) => transformMoodleMember(member)),
        messages: conversation.messages.map((message) => transformMoodleMessage(message)),
        canDeleteMessagesForEveryone: conversation.candeletemessagesforallusers
    };
};

export const lookupSchoolMoodle = async (school: any): Promise<boolean> => {
    try {
        await lookup(`mo${school}.schule.hessen.de`);
        return true;
    } catch (error) {
        return false;
    }
};
