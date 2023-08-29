import { Credentials } from "./auth";

interface VPlanDay {
    date: string;
    day_of_week: string;
    relative: "heute" | "morgen" | "";
    vertretungen: [];
    news: string[];
}

interface VertretungenResponse {
    error: boolean;
    days: VPlanDay[];
    last_updated: string;
}

interface MoodleConversationsResponse {
    error: boolean;
    error_details?: any;
    conversations: MoodleConversation[];
}

interface MoodleConversation {
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

interface MoodleMessage {
    id: number;
    author: number;
    text: string;
    timestamp: number;
}

interface MoodleMember {
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

export const useSheetState = () => useState<{ open: string[] }>("sheets");

/**
 * Fetches the data of the Vertretungsplan from the API
 * @returns A list of all the days listed on the plan or null - which would indicate that the client should reauthenticate
 */
export const useVplan = async (): Promise<{ last_updated: string; days: VPlanDay[] } | APIFetchError> => {
    const token = useToken().value;
    if (!token) return APIFetchError.Unauthorized;

    const { data, error: fetchError } = await useFetch<VertretungenResponse>("/api/vertretungen", {
        method: "GET",
        headers: { Authorization: token }
    });

    // These could either be 401's, 429's or some other internal error
    if (fetchError.value !== null) {
        if (fetchError.value.status === 401) return APIFetchError.Unauthorized;
        if (fetchError.value.status === 429) return APIFetchError.TooManyRequests;

        return APIFetchError.ServerError;
    }

    if (data.value === null) return APIFetchError.ServerError;

    const { error, ...plan } = data.value;

    return plan;
};

export const useConversations = async (): Promise<MoodleConversation[] | string> => {
    const credentials = useMoodleCredentials().value;
    if (!credentials) return "401: Unauthorized";

    const { data, error } = await useFetch<MoodleConversationsResponse>("/api/moodle/conversations", {
        method: "GET",
        query: {
            ...credentials,
            school: useCredentials<Credentials>().value.school
        }
    });

    if (error.value !== null) return error.value.data.error_details || "Serverfehler";

    if (data.value === null) return "Serverfehler";

    return data.value.conversations;
};

export const useSheet = (sheet: string) => {
    const sheets = useSheetState();

    if (!sheets.value.open.includes(sheet)) return sheets.value.open.push(sheet);

    const index = sheets.value.open.indexOf(sheet);
    sheets.value.open.splice(index, 1);
};
