export interface Credentials {
    username: string;
    password: string;
    school: number;
    token: string;
}
interface CheckResponse {
    error: boolean;
    error_details?: any;
    valid?: boolean;
}
interface LoginResponse {
    error: boolean;
    error_details?: any;
    token?: string;
    session?: string;
}
interface APIError {
    response: string;
    message: string;
    recoverable: boolean;
}
interface MoodleLoginResponse {
    error: boolean;
    error_details?: any;
    cookie: string;
    session: string;
    paula: string;
    user: number;
}
interface MoodleCheckResponse {
    error: boolean;
    valid: boolean;
    user: number | null;
    remaining: number | null;
}
interface MoodleCredentials {
    cookie: string;
    session: string;
    paula: string;
    user: number;
}
export interface MoodleState {
    loggedIn: boolean;
    conversations: [];
    events: [];
}

import { callWithNuxt } from "nuxt/app";

export const useCredentials = <T>() => useCookie<T | Credentials>("credentials");
export const useToken = () => useCookie<string>("token");
export const useSession = () => useCookie<string>("session");
export const useMoodleCredentials = () => useCookie<MoodleCredentials>("moodle-credentials");

/**
 * Validates the token stored in the credentials cookie
 * @returns Whether the stored token is valid
 */
export const useTokenCheck = async (): Promise<boolean> => {
    const nuxtApp = useNuxtApp();

    const token = useToken();
    if (!token.value) return false;

    const { data: validation, error } = await useFetch<CheckResponse>("/api/check", {
        method: "GET",
        headers: { Authorization: token.value },
        retry: false
    });

    if (error.value !== null) {
        // @ts-expect-error
        // Because we have an async call just before that,
        // we can no longer call any composable without using this wrapper...
        // (See https://github.com/nuxt/nuxt/issues/14269)
        (await callWithNuxt(nuxtApp, useState<APIError>, ["api-error"])).value = {
            response: syntaxHighlight(error.value.data),
            message: "Anmeldung fehlgeschlagen",
            recoverable: false
        };

        return false;
    }

    return validation.value?.valid || false;
};

export const useLogin = async (failOnError: boolean): Promise<boolean> => {
    const nuxtApp = useNuxtApp();

    const credentials = useCredentials();
    if (!credentials.value) return false;

    const { data: login, error } = await useFetch<LoginResponse>("/api/login", {
        method: "POST",
        body: toRaw(credentials.value),
        retry: false
    });

    if (error.value !== null) {
        if (failOnError)
            // @ts-expect-error
            (await callWithNuxt(nuxtApp, useState<APIError>, ["api-error"])).value = {
                response: syntaxHighlight(error.value?.data),
                message: "Anmeldung fehlgeschlagen",
                recoverable: false
            };

        return false;
    }

    if (!login.value?.token || !login.value.session) {
        if (failOnError) (await callWithNuxt(nuxtApp, useCookie, ["credentials"])).value = null;
        return false;
    }

    useToken().value = login.value.token;
    useSession().value = login.value.session;

    return true;
};

export const useMoodleLogin = async (): Promise<boolean> => {
    // The session token is required to proceed to Moodle login
    if (!useSession().value || !useCredentials<Credentials>().value.school) return false;

    // This will get used by other components when building
    // message boards and other stuff relating to Moodle
    useState("moodle").value = {
        loggedIn: false,
        conversations: [],
        events: []
    };

    const { data, error: fetchError } = await useFetch<MoodleLoginResponse>("/api/moodle/login", {
        method: "POST",
        body: {
            session: useSession().value,
            school: useCredentials<Credentials>().value.school
        },
        retry: false
    });

    // It isn't dramatic if the Moodle login is not successful
    if (fetchError.value !== null || data.value === null) {
        useState<APIError>("api-error").value = {
            response: syntaxHighlight(fetchError.value?.data || "Serverfehler"),
            message: "Konnte Moodledaten nicht überprüfen",
            recoverable: true
        };
        useAppErrors().value.conversations = "Serverfehler";
        return false;
    }

    useState<MoodleState>("moodle").value.loggedIn = true;
    const { error, ...credentials } = data.value;
    useMoodleCredentials().value = credentials;

    return true;
};

export const useMoodleCheck = async (): Promise<boolean> => {
    const credentials = useMoodleCredentials().value;
    if (!credentials || !useCredentials().value) return false;

    const { data, error } = await useFetch<MoodleCheckResponse>("/api/moodle/check", {
        method: "GET",
        query: {
            ...credentials,
            school: useCredentials<null>().value?.school
        },
        retry: false
    });

    if (error.value !== null) {
        useState<APIError>("api-error").value = {
            response: syntaxHighlight(error.value.data),
            message: "Konnte Moodledaten nicht überprüfen",
            recoverable: true
        };
        useAppErrors().value = {
            ...useAppErrors().value,
            conversations: "Serverfehler",
            "moodle-courses": "Serverfehler",
            "moodle-events": "Serverfehler",
            "moodle-notifications": "Serverfehler"
        };
        return false;
    }

    return data.value?.valid || false;
};

export const syntaxHighlight = (json: any = {}) =>
    JSON.stringify(json, null, 2)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/gm, (match) => {
            let type = "number";
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    type = "key";
                } else {
                    type = "string";
                }
            } else if (/true|false/.test(match)) {
                type = "boolean";
            } else if (/null/.test(match)) {
                type = "null";
            }
            return `<span class="${type}">${match}</span>`;
        });
