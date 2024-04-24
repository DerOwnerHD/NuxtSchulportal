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
export interface LoginResponse {
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

import { callWithNuxt } from "nuxt/app";

export const useCredentials = <T>() => useCookie<T | Credentials>("credentials");
export const useToken = () => useCookie<string>("token");
export const useSession = () => useCookie<string>("session");
export const useMoodleCredentials = () => useCookie<MoodleCredentials>("moodle-credentials");
export const useSchool = () => {
    const credentials = useCredentials<Credentials>();
    if (!credentials.value) return null;
    return credentials.value.school;
};

/**
 * Validates the token stored in the credentials cookie
 * @returns Whether the stored token is valid
 */
export const useTokenCheck = async (token: string): Promise<boolean> => {
    const nuxtApp = useNuxtApp();

    const { data: validation, error } = await nuxtApp.runWithContext(
        async () =>
            await useFetch<CheckResponse>("/api/check", {
                method: "GET",
                headers: { Authorization: token },
                retry: false
            })
    );

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

export const useLogin = async (showError: boolean) => {
    const nuxt = useNuxtApp();
    const credentials = useCredentials<Credentials>();
    try {
        const { data, error } = await useFetch("/api/login", {
            method: "POST",
            body: credentials.value
        });
        if (error.value) throw error.value;
        // @ts-ignore
        const { session, token } = data.value;
        nuxt.runWithContext(() => {
            useSession().value = session;
            useToken().value = token;
        });
        return true;
    } catch (error) {
        console.error(error);
        if (showError)
            nuxt.runWithContext(
                () =>
                    (useState<APIError>("api-error").value = {
                        // @ts-ignore
                        response: syntaxHighlight(error.data),
                        message: "Anmeldung fehlgeschlagen",
                        recoverable: false
                    })
            );
        return false;
    }
};

export const useMoodleLogin = async (): Promise<boolean> => {
    // The session token is required to proceed to Moodle login
    if (!useSession().value || !useCredentials<Credentials>().value.school) return false;

    const { data, error: fetchError } = await useFetch<MoodleLoginResponse>("/api/moodle/login", {
        method: "POST",
        body: {
            session: useSession().value,
            school: useCredentials<Credentials>().value.school
        },
        retry: false
    });

    // It isn't dramatic if the Moodle login is not successful
    if (fetchError.value !== null) {
        const { data, cause } = fetchError.value;
        const { error_details } = data;
        useAppErrors().value.conversations = error_details || cause;
        useAppErrors().value["moodle-notifications"] = error_details || cause;
        useAppErrors().value["moodle-courses"] = error_details || cause;
        useAppErrors().value["moodle-events"] = error_details || cause;
        // On Windows, it often fails using the EBUSY error,
        // so this would be very annoying to get every time we run
        if (window.location.host === "localhost") return false;
        useState<APIError>("api-error").value = {
            response: syntaxHighlight(fetchError.value?.data || "Serverfehler"),
            message: "Konnte Moodledaten nicht überprüfen",
            recoverable: true
        };
        return false;
    }

    // We can reasonably assert that data must exist if error does not
    if (data.value === null) return false;

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
        if (window.location.host === "localhost") return false;
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
