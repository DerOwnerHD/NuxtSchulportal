import { parseCookies } from "./utils";

export const hasInvalidSidRedirect = (response: Response) => {
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
};
