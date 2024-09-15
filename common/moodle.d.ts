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

export interface MoodleNotification {
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
