/**
 * @deprecated
 */
export const useSheetState = () => useState<{ open: string[] }>("sheets");
/**
 * @deprecated
 */
export const useAppNews = () => useState<{ [app: string]: number }>("app-news");

/**
 * @deprecated
 */
export const useMoodleEvents = async () => {
    const credentials = checkMoodleCredentials();
    if (typeof credentials === "string") return credentials;

    const { data, error } = await useFetch("/api/moodle/events", {
        method: "GET",
        query: {
            ...credentials,
            school: useCredentials().value.school
        },
        retry: false
    });

    return handleReponse(error, data, data.value?.events);
};

/**
 * @deprecated
 */
export const useMoodleNotifications = async () => {
    const credentials = checkMoodleCredentials();
    if (typeof credentials === "string") return credentials;

    const { data, error } = await useFetch("/api/moodle/notifications", {
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

/**
 * @deprecated
 */
const handleReponse = (error: any, data: any, value: any) => {
    if (error.value !== null) return error.value.data.error_details || "Serverfehler";
    if (data.value === null) return "Serverfehler";
    return value;
};

/**
 * @deprecated
 */
export const useConversations = async (type?: "favorites" | "groups") => {
    const credentials = checkMoodleCredentials();
    if (typeof credentials === "string") return credentials;

    const { data, error } = await useFetch("/api/moodle/conversations", {
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

/**
 * @deprecated
 */
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
