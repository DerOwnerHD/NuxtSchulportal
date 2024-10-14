function shouldGenerateSSOLink(link: string) {
    try {
        const url = new URL(link);
        const isInvalidHost = !url.host.endsWith(".hessen.de");
        const hasDisallowedProtocol = !["https:", "http:"].includes(url.protocol);
        const hasCredentialsSet = !!(url.password || url.username);
        return !(isInvalidHost || hasDisallowedProtocol || hasCredentialsSet);
    } catch {
        return false;
    }
}

export const useSSOLinkGenerator = () => useState<string | null>("sso-link", () => null);

/**
 * Requests a SSO (single sign-on) link from the API. Used to open new tabs/windows and immediatly redirect the user to that
 * link upon successful login. Opening the link directly would most often result in the user being unauthed on the SPH, having to
 * press "Back home", which would re-auth them but would also send them back to that homescreen upon auth.
 *
 * Generating a SSO link prevents this as it gives a token which the SPH uses to redirect the user accordingly.
 * This even works if the session the browser stored is still valid.
 * @param link The link which should be encoded.
 * @returns
 */
export function generateSSOLink(link: string) {
    return `https://login.schulportal.hessen.de/?i=${school.value}&url=${encodeURIComponent(btoa(link))}`;
}
