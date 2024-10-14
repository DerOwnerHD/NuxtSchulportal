const BLACKLISTED_REDIRECT_PATHS = ["/login", "/logoff", "/", "/status"];
export default defineNuxtRouteMiddleware(async (to, from) => {
    // If we navigate between routes on the client and have already checked auth on the server,
    // there is no need to check again. A theoretical scenario in which we wouldn't have checked
    // auth on the server MIGHT be where the client has the site cached from some time ago, thus
    // not having valid auth anymore and this flag not being set from the server.
    // NO IDEA IF THIS ACTUALLY WORKS
    if (import.meta.browser && useAuthSSR().value) return;
    if (import.meta.server) useAuthSSR().value = true;
    const credentials = useCredentials();
    // The path we wish to be redirected to once the user has logged in for the first time
    // When already logged in, this is not needed as the auth happens directly inside of this
    // middleware and we never get redirected to any other page.
    const redirectTo = to.path !== "/" ? `?redirect=${encodeURIComponent(to.fullPath)}` : "";
    if (!credentials.value) return to.path === "/login" ? void 0 : navigateTo(`/login${redirectTo}`);

    const validCredentialsSyntax =
        credentials.value &&
        typeof credentials.value.username === "string" &&
        typeof credentials.value.password === "string" &&
        typeof credentials.value.school === "number";

    if (!validCredentialsSyntax && to.path !== "/login") {
        // @ts-ignore we remove the cookie
        credentials.value = null;
        return navigateTo(`/login?redirect=${redirectTo}`);
    }

    // The user may set multiple parameters with the same name
    const { redirect } = to.query;
    if (Array.isArray(redirect)) throw createError({ message: "Cannot have multiple redirects", data: redirect });
    if (to.path === "/login") {
        // Phising attacks SHOULD be prevented by preventing the use of https:// or even //
        // (anything that is not /<path>)
        if (redirect && !/^\/[^/]+.*$/.test(redirect)) throw createError({ message: "Phishing attempt detected", data: redirect });
        if (redirect && BLACKLISTED_REDIRECT_PATHS.includes(redirect)) {
            navigateTo("/", { external: true });
            return;
        }
        // To allow the page to reload, external is set
        navigateTo(redirect ?? "/", { external: true });
        return;
    }

    const token = useToken();
    if (!token.value) return await useAuthenticate();

    const isTokenValid = await checkToken();
    console.log("Token valid: " + isTokenValid);
    if (!isTokenValid) return await useAuthenticate();

    return;
});
