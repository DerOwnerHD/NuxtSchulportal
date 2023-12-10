import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import { generateDefaultHeaders, parseCookie, patterns, setErrorResponse, transformEndpointSchema, validateQuery } from "../utils";

const schema = {
    query: {
        category: { required: false, type: "number", min: 1, max: 11 },
        start: { required: true, pattern: patterns.DATE_YYYY_MM_DD_HYPHENS_OR_YEAR },
        end: { required: false, pattern: patterns.DATE_YYYY_MM_DD_HYPHENS },
        query: { required: false, type: "string", max: 20 },
        new: { required: false, type: "boolean" }
    }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const query = getQuery<{ category?: number; start: string; end?: string; query?: string; new?: "true" | "false" }>(event);
    if (!validateQuery(query, schema.query)) return setErrorResponse(res, 400, transformEndpointSchema(schema));

    const { authorization } = req.headers;
    if (!authorization) return setErrorResponse(res, 400, "'authorization' header missing");
    if (!patterns.SID.test(authorization)) return setErrorResponse(res, 400, "'authorization' header invalid");

    const rateLimit = handleRateLimit("/api/calendar.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { start, end, category } = query;
    const requestForm = [
        // Some known types of this are either getEvents or iCalAbo
        // => see /calendar/export endpoint
        `f=getEvents`,
        `start=${start}`,
        `end=${end ?? ""}`,
        `k=${category ?? ""}`,
        `s=${encodeURIComponent(query.query || "")}`,
        // Using the + operator converts the boolean to either 0 or 1
        `new=${+(query.new === "true")}`
    ].join("&");

    try {
        const response = await fetch("https://start.schulportal.hessen.de/kalender.php", {
            method: "POST",
            headers: {
                Cookie: `sid=${authorization}`,
                "Content-Type": "application/x-www-form-urlencoded",
                ...generateDefaultHeaders()
            },
            body: requestForm
        });

        // The "i" cookie is the institution (school) cookie and if it's set to
        // 0, no school is obviously selected (so the sid is invalid or expired)
        const cookies = parseCookie(response.headers.getSetCookie().join("; "));
        if (cookies.i === "0") return setErrorResponse(res, 401);

        const data = (await response.json()) as BasicCalendarEntry[];
        if (!Array.isArray(data)) throw new TypeError("Calendar entries expected to be Array");
        return { error: false, entries: data.map((entry) => transformCalendarEntry(entry)) };
    } catch (error) {
        console.error(error);
        setErrorResponse(res, 500);
    }
});

type JaNein = "ja" | "nein";
// This is how the SPH formats these things *sigh*
interface BasicCalendarEntry {
    Institution: string; // Contains a number like "1234" (whyever)
    Id: string; // also a number wrapped in a string
    FremdUID: string | null; // Most often some stuff from "schulferien.eu"
    LetzteAenderung: string;
    Anfang: string;
    Ende: string;
    Verantwortlich: string | null; // This contains most likely some user id
    Ort: string | null;
    Oeffentlich: JaNein; // WHY JUST WHY
    Privat: JaNein;
    Geheim: JaNein;
    Neu: JaNein;
    title: string;
    // WHY IS THIS SOMETIMES A NUMBER (on the week-20xx-xx) where category = 0 (undefined on client)
    category: string | number; // Contains the same category ID we request from the user
    description: string;
    allDay: boolean;
    start: string;
    end: string;
    _tool?: string; // Only known value is "Schulwochen"
}

interface CalendarEntry {
    school: number;
    id: number;
    start: string;
    end: string;
    last_updated: string;
    author: string | null;
    location: string | null;
    public: boolean;
    private: boolean;
    secret: boolean;
    new: boolean;
    title: string;
    category: number;
    description: string;
    all_day: boolean;
    external_id: string | null;
}

function transformCalendarEntry(entry: BasicCalendarEntry): CalendarEntry {
    const jaNein = (string: JaNein) => string === "ja";
    return {
        school: parseInt(entry.Institution),
        id: parseInt(entry.Id),
        start: entry.start,
        end: entry.end,
        last_updated: entry.LetzteAenderung,
        author: entry.Verantwortlich,
        location: entry.Ort,
        public: jaNein(entry.Oeffentlich),
        private: jaNein(entry.Privat),
        secret: jaNein(entry.Geheim),
        new: jaNein(entry.Neu),
        title: entry.title,
        // @ts-expect-error sometimes it may be 0 as a number
        // still works tho
        category: parseInt(entry.category),
        description: entry.description,
        all_day: entry.allDay,
        external_id: entry.FremdUID
    };
}
