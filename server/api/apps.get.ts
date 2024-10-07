import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { getAuthToken, BasicResponse, generateDefaultHeaders, getOptionalSchool, setErrorResponseEvent, STATIC_STRINGS } from "../utils";

interface Response extends BasicResponse {
    apps: {
        name: string;
        icon: string;
        color: string;
        folders: string[];
        link: string;
    }[];
    folders: {
        name: string;
        icon: string;
        color: string;
    }[];
}

const rlHandler = defineRateLimit({ interval: 15, allowed_per_interval: 3 });
export default defineEventHandler<Promise<Response>>(async (event) => {
    const token = getAuthToken(event);
    if (token === null) return setErrorResponseEvent(event, 400, STATIC_STRINGS.INVALID_TOKEN);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);
    const address = getRequestAddress(event);

    try {
        const response = await fetch("https://start.schulportal.hessen.de/startseite.php?a=ajax&f=apps", {
            headers: {
                Cookie: `sid=${token}; ${getOptionalSchool(event)}`,
                ...generateDefaultHeaders(address)
            },
            redirect: "manual"
        });

        if (response.status === 302) return setErrorResponseEvent(event, 401);

        const text = await response.text();
        if (!text.startsWith("{")) return setErrorResponseEvent(event, 401);

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
        return setErrorResponseEvent(event, 500);
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
