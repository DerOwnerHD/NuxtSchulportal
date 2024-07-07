import { hasInvalidSidRedirect } from "../failsafe";
import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import {
    generateDefaultHeaders,
    patterns,
    setErrorResponse,
    authHeaderOrQuery,
    hasInvalidAuthentication,
    hasPasswordResetLocationSet,
    schoolFromRequest
} from "../utils";
import { SchemaEntryConsumer, validateQueryNew } from "../validator";

const querySchema: SchemaEntryConsumer = {
    category: { required: false, type: "number", min: 1, max: 11 },
    start: { required: true, pattern: patterns.DATE_YYYY_MM_DD_HYPHENS_OR_YEAR },
    end: { required: false, pattern: patterns.DATE_YYYY_MM_DD_HYPHENS },
    query: { required: false, type: "string", max: 20 },
    new: { required: false, type: "boolean" },
    token: { required: false, type: "string", pattern: patterns.SID }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const query = getQuery<{ category?: string; start: string; end?: string; query?: string; new?: "true" | "false" }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponse(res, 400, queryValidation);

    const token = authHeaderOrQuery(event);
    if (token === null) return setErrorResponse(res, 400, "Token not provided or malformed");

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
                Cookie: `sid=${token}; ${schoolFromRequest(event)}`,
                "Content-Type": "application/x-www-form-urlencoded",
                ...generateDefaultHeaders(address)
            },
            body: requestForm
        });

        if (hasInvalidSidRedirect(response)) return setErrorResponse(res, 403, "Route gesperrt");
        if (hasInvalidAuthentication(response)) return setErrorResponse(res, 401);
        if (hasPasswordResetLocationSet(response)) return setErrorResponse(res, 418, "Lege dein Passwort fest");

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
