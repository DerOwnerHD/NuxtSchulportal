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
    // Whenever reauthing on the client, we may just clear our current AES key right here
    // If another function then invokes this, it gets a new one for its current token
    // (It would get it anyway but this just removes some small headache)
    if ("localStorage" in globalThis) localStorage.removeItem("aes-key");
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

export async function useReauthenticate(error: any) {
    if (!("status" in error)) return;
    if (error.status !== 401) return;
    console.log("Credentials invalid, reauthenticating!");
    await useAuthenticate();
    alert("Neu eingeloggt!");
}
