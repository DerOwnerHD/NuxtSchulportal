export interface PreMoodleConversationMember {
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
    contactrequests: any[];
}

export interface PreMoodleCourse {
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

export interface PreMoodleConversationMessage {
    id: number;
    useridfrom: number;
    text: string;
    timecreated: number;
}

export interface PreMoodleConversation {
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
    members: PreMoodleConversationMember[];
    messages: PreMoodleConversationMessage[];
    candeletemessagesforallusers: boolean;
}

export interface PreMoodleNotification {
    id: number;
    useridfrom: number;
    useridto: number;
    subject: string;
    shortenedsubject: string;
    text: string;
    fullmessage: string;
    fullmessageformat: number;
    fullmessagehtml: string;
    smallmessage: string;
    contexturl: string;
    contexturlname: string;
    timecreated: number;
    timecreatedpretty: string;
    timeread: number;
    read: boolean;
    deleted: boolean;
    iconurl: string;
    component: string;
    eventtype: string;
    customdata: string;
}

export interface PreMoodleEvent {
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
    course: PreMoodleCourse;
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

export interface MoodleConversation {
    id: number;
    name: string;
    subname: string | null;
    icon: string | null;
    type: number;
    memberCount: number;
    muted: boolean;
    favorite: boolean;
    unread: number;
    members: MoodleConversationMember[];
    messages: any[];
    canDeleteMessagesForEveryone: boolean;
}

export interface MoodleConversationMember {
    id: number;
    name: string;
    profile: string;
    avatar: {
        small: string;
        default: string;
    };
    online: boolean | null;
    showStatus: boolean;
    blocked: boolean;
    contact: boolean;
    deleted: boolean;
    abilities: {
        message: boolean | null;
        messageIfBlocked: boolean | null;
    };
    requiresContact: boolean | null;
    contactRequests: any[];
}

export interface MoodleCourse {
    id: number;
    category: string;
    image: string;
    timestamps: {
        start: number;
        end: number;
    };
    names: {
        full: string;
        display: string;
        short: string;
    };
    progress: {
        visible: boolean;
        percentage: number;
    };
    hidden: boolean;
    favorite: boolean;
    exportFont: string;
    properties: {
        activityDates: boolean;
        completionConditions: boolean;
        shortName: boolean;
    };
    summary: {
        text: string;
        format: number;
    };
    link: string;
}

export interface MoodleEvent {
    id: number;
    name: string;
    description: {
        text: string;
        format: number;
    };
    location: string;
    category: number | null;
    user: number;
    repeat: number | null;
    count: number | null;
    type: string;
    instance: number;
    activity: {
        name: string;
        description: string;
    };
    timestamps: {
        start: number;
        modified: number;
        midnight: number;
        duration: number;
        sort: number;
    };
    visible: boolean;
    overdue: boolean;
    icon: {
        key: string;
        component: string;
        alt: string;
        url: string;
        class: string;
    };
    course: MoodleCourse;
    abilities: {
        edit: boolean;
        delete: boolean;
    };
    links: {
        edit: string;
        delete: string;
        view: string;
    };
    formatted: {
        time: string;
        location: string;
    };
}

export interface MoodleNotification {
    id: number;
    author: number;
    subject: string;
    message: {
        short: string;
        full: string;
    };
    read: boolean;
    deleted: boolean;
    icon: string;
    timestamps: {
        created: number;
        read: number;
        pretty: string;
    };
    link: string;
}

export interface MoodleMessage {
    id: number;
    author: number;
    text: string;
    timestamp: number;
}
