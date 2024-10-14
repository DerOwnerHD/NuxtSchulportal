import { parseCookies } from "./utils";

/**
 * Checks whether SPH redirects to a / as a location and sends the client another SID.
 *
 * The cause of this is unknown, however it still occurs often. In these scenarios, only
 * a full reauth seems to be the solution.
 *
 * Note that the SID cookie that the server responds with is entirely invalid. There might
 * be some requirement (i.e. the client should navigate to / with that sid and their credentials and then auth there...)
 * @param response The Fetch response object
 * @returns Whether a redirect with that state is set
 */
export function hasInvalidSidRedirect(response: Response) {
    const location = response.headers.get("location");
    const cookies = parseCookies(response.headers.getSetCookie());

    // This is our default weird behaviour. We try to GET some
    // site on the SPH, it gives us a 302 with a location for the
    // homepage and a new sid. This sid does not do ANYTHING (it seems).
    // Thusly we just want to warn the user that this in fact,
    // is broken and they ought to reauth to use SPH (but it seems that just
    // this page is actually broken, all others still work)
    if (location === "/" && cookies["sid"]) return true;

    // This is only the case when we do not catch redirects (like for the SPlan)
    // This is basically the same thing as above, but we've already been redirected
    if (response.url === "https://start.schulportal.hessen.de/" && cookies["i"] === "0") return true;

    return false;
}

/**
 * Checks whether the response has the "i" (institution) cookie is set to "0",
 * thus meaning the authentication provided by the user is not valid.
 * @param response The Fetch API response thats supposed to be parsed
 * @returns whether the request is sucessfully authed
 */
export function hasInvalidAuthentication(response: Response) {
    return parseCookies(response.headers.getSetCookie())["i"] === "0";
}

/**
 * If the user has changed/reset their password (including over our ui),
 * they will have to navigate to the real SPH to change/confirm their changes there.
 *
 * Attempting to navigate to any page on the SPH will route there. Thus, we
 * detect this state and remind the user to go there.
 *
 * @param response The Fetch Response object
 * @returns Whether the response should be blocked due to user action being required
 */
export function hasPasswordResetLocationSet(response: Response) {
    const url = /^(https?\:\/\/start\.schulportal\.hessen\.de\/)?benutzerverwaltung\.php\?a=userChangePassword$/i;
    return (response.status === 302 && url.test(response.headers.get("location") ?? "")) || url.test(response.url);
}
