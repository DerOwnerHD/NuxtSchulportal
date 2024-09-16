import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import { authHeaderOrQuery, generateDefaultHeaders, schoolFromRequest, setErrorResponse, STATIC_STRINGS } from "../utils";

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = getRequestIP(event, { xForwardedFor: true });

    const token = authHeaderOrQuery(event);
    if (token === null) return setErrorResponse(res, 400, STATIC_STRINGS.INVALID_TOKEN);

    const rateLimit = handleRateLimit("/api/apps.get", address, req.headers["x-ratelimit-bypass"]);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    try {
        const response = await fetch("https://start.schulportal.hessen.de/startseite.php?a=ajax&f=apps", {
            headers: {
                Cookie: `sid=${token}; ${schoolFromRequest(event)}`,
                ...generateDefaultHeaders(address)
            },
            redirect: "manual"
        });

        if (response.status === 302) return setErrorResponse(res, 401);

        const text = await response.text();
        if (!text.startsWith("{")) return setErrorResponse(res, 401);

        const data = JSON.parse(text) as AppList;

        const folders = data.folders.map((folder) => {
            const { name, logo, farbe } = folder;
            return { name, icon: logo, color: farbe };
        });

        const apps = data.entrys.map((entry) => {
            const { Name, Farbe, Logo, Ordner, link } = entry;
            return { name: Name, icon: Logo, color: Farbe, folders: Ordner, link };
        });

        return { error: false, apps, folders };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});

interface AppList {
    error: string;
    folders: {
        name: string;
        logo: string;
        farbe: string;
    }[];
    entrys: {
        Name: string;
        Farbe: string;
        Logo: string;
        Ordner: string[];
        link: string;
        target?: string;
    }[];
    // A timestamp (appears to be always one hour later)
    till: number;
}
