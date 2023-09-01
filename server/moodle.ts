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
