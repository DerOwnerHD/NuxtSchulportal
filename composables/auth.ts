interface Credentials {
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
}

import { callWithNuxt } from "nuxt/app";

export const useCredentials = <T>() => useCookie<T | Credentials>("credentials");
export const useToken = () => useCookie<string>("token");

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
            message: "Anmeldung fehlgeschlagen"
        };

        return false;
    }

    return validation.value?.valid || false;
};

export const useLogin = async (): Promise<boolean> => {
    const nuxtApp = useNuxtApp();

    const credentials = useCredentials();
    if (!credentials.value) return false;

    const { data: login, error } = await useFetch<LoginResponse>("/api/login", {
        method: "POST",
        body: toRaw(credentials.value),
        retry: false
    });

    if (error.value !== null) {
        // @ts-expect-error
        (await callWithNuxt(nuxtApp, useState<APIError>, ["api-error"])).value = {
            response: syntaxHighlight(error.value?.data),
            message: "Anmeldung fehlgeschlagen"
        };

        return false;
    }

    if (!login.value?.token) {
        (await callWithNuxt(nuxtApp, useCookie, ["credentials"])).value = null;
        return false;
    }

    useToken().value = login.value.token;

    return true;
};

const syntaxHighlight = (json: any = {}) =>
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
