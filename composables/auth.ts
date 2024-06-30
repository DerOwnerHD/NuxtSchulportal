export interface Credentials {
    username: string;
    password: string;
    school: number;
}
interface MoodleCredentials {
    cookie: string;
    session: string;
    paula: string;
    user: number;
}

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

const isLoggingIn = ref(false);
/**
 * Logs in somebody who already has credentials set. Throws an error on failing, showing
 * details. Should be used when a token has expired or is no longer stored.
 */
export async function useAuthenticate() {
    if (isLoggingIn.value) return console.warn("Cannot log in more than once at a time");
    isLoggingIn.value = true;
    const credentials = useCredentials();
    const nuxt = useNuxtApp();
    // Even though we shouldn't use useFetch in a non-setup function on the client,
    // using $fetch during SSR (which this function is called in sometimes) results
    // in no IP getting passed through for rate limiting => 403 error
    const { data, error } = await useFetch("/api/login", {
        method: "POST",
        body: credentials.value
    });

    if (error.value) {
        isLoggingIn.value = false;
        throw createError({
            message: "Loginfehler",
            data: error.value.data?.error_details ?? error.value.cause
        });
    }

    console.log("Authenticated!");

    // @ts-ignore
    const { token, session } = data.value;
    // Whenever reauthing on the client, we may just clear our current AES key right here
    // If another function then invokes this, it gets a new one for its current token
    // (It would get it anyway but this just removes some small headache)
    if ("localStorage" in globalThis) localStorage.removeItem("aes-key");
    isLoggingIn.value = false;
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

    localStorage.removeItem("aes-key");
    localStorage.removeItem("splan-cache");

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
    if (isLoggingIn.value) return;
    if (!("status" in error)) return;
    if (error.status !== 401) return;
    console.log("Credentials invalid, reauthenticating!");
    await useAuthenticate();
    alert("Neu eingeloggt!");
}
