export interface Credentials {
    username: string;
    password: string;
    school: number;
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

export const useCredentials = () => useCookie<Credentials>("credentials");
export const useToken = () => useCookie<string>("token");
export const useSession = () => useCookie<string>("session");
export const useMoodleCredentials = () => useCookie<MoodleCredentials>("moodle-credentials");
export const useSchool = () => {
    const credentials = useCredentials();
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
    const credentials = useCredentials();
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
    if (!useSession().value || !useCredentials().value.school) return false;

    const { data, error: fetchError } = await useFetch<MoodleLoginResponse>("/api/moodle/login", {
        method: "POST",
        body: {
            session: useSession().value,
            school: useCredentials().value.school
        },
        retry: false
    });

    // It isn't dramatic if the Moodle login is not successful
    if (fetchError.value !== null) {
        const { data, cause } = fetchError.value;
        const { error_details } = data;
        useState<APIError>("api-error").value = {
            response: syntaxHighlight(fetchError.value.data),
            message: "Konnte Moodledaten nicht überprüfen",
            recoverable: true
        };
        useAppErrors().value = {
            ...useAppErrors().value,
            conversations: error_details ?? "Serverfehler",
            "moodle-courses": error_details ?? "Serverfehler",
            "moodle-events": error_details ?? "Serverfehler",
            "moodle-notifications": error_details ?? "Serverfehler"
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
            school: useCredentials().value?.school
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

export const useAuthSSR = () => useState("checked-auth-on-ssr", () => false);

/**
 * Logs in somebody who already has credentials set. Throws an error on failing, showing
 * details. Should be used when a token has expired or is no longer stored.
 */
export async function useAuthenticate() {
    const credentials = useCredentials();
    const nuxt = useNuxtApp();
    const { data, error } = await useFetch("/api/login", {
        method: "POST",
        body: credentials.value
    });

    if (error.value)
        throw createError({
            message: "Loginfehler",
            data: error.value.data?.error_details ?? error.value.cause
        });

    console.log("Authenticated!");

    // @ts-ignore
    const { token, session } = data.value;
    nuxt.runWithContext(() => {
        useToken().value = token;
        useSession().value = session;
    });
}

export async function checkToken() {
    const token = useToken();
    if (!token.value) return false;
    const { data, error } = await useFetch("/api/check", { query: { token: useToken().value } });
    if (error.value?.status === 429) throw createError({ message: "Loginfehler", data: error.value.data });
    return !error.value && data.value?.valid;
}

export async function logOff() {
    const stop = confirm("Willst du dich wirklich abmelden?");
    if (!stop) return;

    if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();

        if (subscription != null) await subscription.unsubscribe();
        if (registration != null) await registration.unregister();
    }

    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
        const equals = cookie.indexOf("=");
        const name = equals > -1 ? cookie.substring(0, equals) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }

    // Make sure the cookies have some time to actually get deleted
    await useWait(100);

    location.reload();
}

export const isLoggedIn = () => !!useToken().value;
