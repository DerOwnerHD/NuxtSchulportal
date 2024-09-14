interface MoodleConversationsResponse {
    error: boolean;
    error_details?: any;
    conversations: MoodleConversation[];
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
    unread: number | null;
    members: MoodleMember[];
    messages: MoodleMessage[];
    canDeleteMessagesForEveryone: boolean;
}

export interface MoodleMessage {
    id: number;
    author: number;
    text: string;
    timestamp: number;
}

export interface MoodleMember {
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
        message: boolean;
        messageIfBlocked: boolean;
    };
    requiresContact: boolean;
    contactRequests: [];
}

export enum APIFetchError {
    Unauthorized = 401,
    Forbidden = 403,
    TooManyRequests = 429,
    ServerError = 500
}

interface AppErrorState {
    [app: string]: string | null;
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

interface MoodleCourseResponse {
    error: boolean;
    error_details?: any;
    courses: MoodleCourse[];
}

export interface MoodleEvent {
    id: number;
    name: string;
    description: {
        text: string;
        format: number;
    };
    location: string;
    category: number;
    user: number;
    repeat: number;
    count: number;
    type: string;
    instance: string;
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

interface MoodleEventsResponse {
    error: boolean;
    error_details?: any;
    events: MoodleEvent[];
}

export const useSheetState = () => useState<{ open: string[] }>("sheets");
export const useAppNews = () => useState<{ [app: string]: number }>("app-news");

export const useMoodleEvents = async (): Promise<MoodleEvent[] | string> => {
    const credentials = checkMoodleCredentials();
    if (typeof credentials === "string") return credentials;

    const { data, error } = await useFetch<MoodleEventsResponse>("/api/moodle/events", {
        method: "GET",
        query: {
            ...credentials,
            school: useCredentials().value.school
        },
        retry: false
    });

    return handleReponse(error, data, data.value?.events);
};

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

interface MoodleNotificationResponse {
    error: boolean;
    error_details?: any;
    notifications: MoodleNotification[];
}

export const useMoodleNotifications = async (): Promise<MoodleNotification[] | string> => {
    const credentials = checkMoodleCredentials();
    if (typeof credentials === "string") return credentials;

    const { data, error } = await useFetch<MoodleNotificationResponse>("/api/moodle/notifications", {
        method: "GET",
        query: {
            ...credentials,
            school: useCredentials().value.school
        },
        retry: false
    });

    return handleReponse(error, data, data.value?.notifications);
};

const checkMoodleCredentials = () => useMoodleCredentials().value ?? "401: Unauthorized";

const handleReponse = (error: any, data: any, value: any) => {
    if (error.value !== null) return error.value.data.error_details || "Serverfehler";
    if (data.value === null) return "Serverfehler";
    return value;
};

export const useConversations = async (type?: "favorites" | "groups"): Promise<MoodleConversation[] | string> => {
    const credentials = checkMoodleCredentials();
    if (typeof credentials === "string") return credentials;

    const { data, error } = await useFetch<MoodleConversationsResponse>("/api/moodle/conversations", {
        method: "GET",
        query: {
            ...credentials,
            school: useCredentials().value.school,
            type
        },
        retry: false
    });

    return handleReponse(error, data, data.value?.conversations);
};

export const useOpenSheet = (sheet: string, open?: boolean) => {
    const sheets = useSheetState();
    const body = document.querySelector("body");
    if (!body) return;

    if (sheets.value.open.includes(sheet) && open) return;
    if (!sheets.value.open.includes(sheet)) {
        body.style.overflow = "hidden";
        return sheets.value.open.push(sheet);
    }

    const index = sheets.value.open.indexOf(sheet);
    sheets.value.open.splice(index, 1);

    if (!sheets.value.open.length) body.style.overflow = "";
};
