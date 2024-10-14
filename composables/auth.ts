export interface Credentials {
    username: string;
    password: string;
    school: number;
}

export const useCredentials = () => useCookie<Credentials>("credentials");
export const useToken = () => useCookie<string>("token");
export const useSession = () => useCookie<string>("session");
export const school = computed(() => {
    const credentials = useCredentials();
    if (!credentials.value) return null;
    return credentials.value.school;
});

export const useAuthSSR = () => useState("checked-auth-on-ssr", () => false);

export const useLoggingInStatus = () => useState("is-logging-in", () => false);
/**
 * Logs in somebody who already has credentials set. Throws an error on failing, showing
 * details. Should be used when a token has expired or is no longer stored.
 */
export async function useAuthenticate() {
    const isLoggingIn = useLoggingInStatus();
    if (isLoggingIn.value) {
        console.warn("Cannot log in more than once at a time");
        return false;
    }
    isLoggingIn.value = true;
    const credentials = useCredentials();
    const nuxt = useNuxtApp();

    const authenticator = import.meta.client ? new ClientAuthenticator(credentials) : new SSRAuthenticator(credentials);
    const auth = await authenticator.authenticate();

    if (auth.error) {
        createError({
            message: "Loginfehler",
            data: auth.error_details
        });
        isLoggingIn.value = false;
        return false;
    }

    console.log("Authenticated!");
    const { token, session } = auth;
    // Whenever reauthing on the client, we may just clear our current AES key right here
    // If another function then invokes this, it gets a new one for its current token
    // (It would get it anyway but this just removes some small headache)
    if ("localStorage" in globalThis) localStorage.removeItem("aes-key");
    isLoggingIn.value = false;
    nuxt.runWithContext(() => {
        useToken().value = token!;
        useSession().value = session!;
    });
    return true;
}

/**
 * Woo! Classes have been used!
 */
abstract class Authenticator {
    protected creds: Credentials | null = null;
    public constructor(credentials: Ref<Credentials>) {
        if (!credentials.value) throw new ReferenceError("Could not obtain credentials for auth");
        this.creds = credentials.value;
    }
    public async authenticate(): Promise<AuthResponse> {
        return null as any;
    }
}

class SSRAuthenticator extends Authenticator {
    constructor(credentials: Ref<Credentials>) {
        super(credentials);
    }
    public override async authenticate(): Promise<AuthResponse> {
        const { data, error } = await useFetch("/api/login", { method: "POST", body: this.creds });
        if (error.value) {
            return { error: true, error_details: parseResponseError(error.value) };
        }
        return { error: false, token: data.value?.token, session: data.value?.session };
    }
}

class ClientAuthenticator extends Authenticator {
    constructor(credentials: Ref<Credentials>) {
        super(credentials);
    }
    public override async authenticate(): Promise<AuthResponse> {
        try {
            const response = await $fetch("/api/login", {
                method: "POST",
                body: this.creds
            });
            // If no error was thrown, we can always assert that the response was successful.
            const { token, session } = response;
            return { error: false, token, session };
        } catch (error) {
            return { error: true, error_details: parseResponseError(error) };
        }
    }
}

interface AuthResponse {
    error: boolean;
    error_details?: any;
    token?: string;
    session?: string;
}

export async function checkToken() {
    const token = useToken();
    if (!token.value) return false;
    const { data, error } = await useFetch("/api/check", { query: { token: useToken().value } });
    if (error.value?.status === 429) throw createError({ message: "Loginfehler", data: error.value.data });
    return !error.value && data.value?.valid;
}

export async function logOff(bypassConfirm?: boolean) {
    if (!bypassConfirm) {
        const stop = confirm("Willst du dich wirklich abmelden?");
        if (!stop) return;
    }

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

export const isLoggedIn = computed(() => !!useToken().value);

/**
 * Performs, if required due to the error's status being 401, a reauth.
 *
 * If one is already in progress, it will be skipped.
 * @param error The response error object
 */
export async function useReauthenticate(error: any, authStack: AuthStack = "sph") {
    if (useLoggingInStatus().value) return;
    if (!("status" in error)) return;
    if (!checkForReauthRequirement(error)) return;
    console.log("Credentials invalid, reauthenticating!");
    const hasAuthSucceeded = await useAuthenticate();
    if (!hasAuthSucceeded) return;
    if (authStack === "moodle") await attemptMoodleLogin();
}

/**
 * What procedure should be used for re-authentication.
 *
 * If something that is not "sph" is provided, the system will run through the corresponding auth requirements.
 * (i.e. Moodle: first, sph, then Moodle itself)
 */
type AuthStack = "sph" | "moodle";
