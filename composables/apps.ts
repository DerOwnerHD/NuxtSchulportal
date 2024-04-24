export interface VertretungsDay {
    date: string;
    day: string;
    day_of_week: string;
    relative: "heute" | "morgen" | "";
    vertretungen: Vertretung[];
    news: string[];
}

export interface Vertretungsplan {
    days: VertretungsDay[];
    last_updated: string | null;
    updating: boolean;
}

export interface Vertretung {
    lessons: {
        list: number[];
        from: number;
        to: number;
    };
    class: string | null;
    substitute: string | null;
    teacher: string | null;
    subject: string | null;
    subject_old: string | null;
    room: string | null;
    note: string | null;
}

interface VertretungenResponse extends Vertretungsplan {
    error: boolean;
}

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
export const useAppErrors = () => useState<AppErrorState>("app-errors");
export const useAppNews = () => useState<{ [app: string]: number }>("app-news");

/**
 * Fetches the data of the Vertretungsplan from the API
 * @returns A list of all the days listed on the plan or null - which would indicate that the client should reauthenticate
 */
export const useVplan = async (): Promise<Vertretungsplan | string> => {
    const token = useToken().value;
    if (!token) return "401: Unauthorized";

    const { data, error: fetchError } = await useFetch<VertretungenResponse>("/api/vertretungen", {
        method: "GET",
        query: { school: useSchool() },
        headers: { Authorization: token },
        retry: false
    });

    const { error, ...plan } = data.value || {};
    return handleReponse(fetchError, data, plan);
};

export const useMoodleCourses = async (): Promise<MoodleCourse[] | string> => {
    const credentials = checkMoodleCredentials();
    if (typeof credentials === "string") return credentials;

    const { data, error } = await useFetch<MoodleCourseResponse>("/api/moodle/courses", {
        method: "GET",
        query: {
            ...credentials,
            school: useCredentials<Credentials>().value.school
        },
        retry: false
    });

    return handleReponse(error, data, data.value?.courses);
};

export const useMoodleEvents = async (): Promise<MoodleEvent[] | string> => {
    const credentials = checkMoodleCredentials();
    if (typeof credentials === "string") return credentials;

    const { data, error } = await useFetch<MoodleEventsResponse>("/api/moodle/events", {
        method: "GET",
        query: {
            ...credentials,
            school: useCredentials<Credentials>().value.school
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
            school: useCredentials<Credentials>().value.school
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
            school: useCredentials<Credentials>().value.school,
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
