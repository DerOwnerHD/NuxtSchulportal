import { CalendarEntry } from "~/common/calendar";
import { hasInvalidSidRedirect } from "../failsafe";
import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import {
    generateDefaultHeaders,
    patterns,
    setErrorResponseEvent,
    getAuthToken,
    hasInvalidAuthentication,
    hasPasswordResetLocationSet,
    getOptionalSchool,
    STATIC_STRINGS,
    BasicResponse
} from "../utils";
import { SchemaEntryConsumer, validateQueryNew } from "../validator";

const querySchema: SchemaEntryConsumer = {
    category: { required: false, type: "number", min: 1, max: 99 },
    start: { required: true, pattern: patterns.DATE_YYYY_MM_DD_HYPHENS_OR_YEAR },
    end: { required: false, pattern: patterns.DATE_YYYY_MM_DD_HYPHENS },
    query: { required: false, type: "string", max: 20 },
    new: { required: false, type: "boolean" },
    token: { required: false, type: "string", pattern: patterns.SID }
};

interface Response extends BasicResponse {
    entries: CalendarEntry[];
}

const rlHandler = defineRateLimit({ interval: 15, allowed_per_interval: 5 });
export default defineEventHandler<Promise<Response>>(async (event) => {
    const query = getQuery<{ category?: string; start: string; end?: string; query?: string; new?: "true" | "false" }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponseEvent(event, 400, queryValidation);

    const token = getAuthToken(event);
    if (token === null) return setErrorResponseEvent(event, 400, STATIC_STRINGS.INVALID_TOKEN);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);
    const address = getRequestAddress(event);

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
                Cookie: `sid=${token}; ${getOptionalSchool(event)}`,
                "Content-Type": "application/x-www-form-urlencoded",
                ...generateDefaultHeaders(address)
            },
            body: requestForm
        });

        if (hasInvalidSidRedirect(response)) return setErrorResponseEvent(event, 403, "Route gesperrt");
        if (hasInvalidAuthentication(response)) return setErrorResponseEvent(event, 401);
        if (hasPasswordResetLocationSet(response)) return setErrorResponseEvent(event, 418, "Lege dein Passwort fest");

        const data = (await response.json()) as BasicCalendarEntry[];
        if (!Array.isArray(data)) throw new TypeError("Calendar entries expected to be Array");
        return { error: false, entries: data.map((entry) => transformCalendarEntry(entry)) };
    } catch (error) {
        console.error(error);
        setErrorResponseEvent(event, 500);
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
