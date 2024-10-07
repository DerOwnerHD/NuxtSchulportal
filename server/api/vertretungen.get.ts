import { Vertretungsplan, VertretungsDay, Vertretung } from "~/common/vertretungsplan";
import { querySelectorArray } from "../dom";
import { hasInvalidSidRedirect } from "../failsafe";
import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import {
    BasicResponse,
    STATIC_STRINGS,
    getAuthToken,
    generateDefaultHeaders,
    hasInvalidAuthentication,
    hasPasswordResetLocationSet,
    removeBreaks,
    getOptionalSchool,
    setErrorResponseEvent
} from "../utils";
import { JSDOM } from "jsdom";
// Starts on sunday cos Date#getDay does too
const DAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

interface Response extends BasicResponse, Vertretungsplan {}

const handleRL = defineRateLimit({ interval: 15, allowed_per_interval: 3 });

export default defineEventHandler<Promise<Response>>(async (event) => {
    const { res } = event.node;

    const token = getAuthToken(event);
    if (token === null) return setErrorResponseEvent(event, 400, STATIC_STRINGS.INVALID_TOKEN);

    const rl = handleRL(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);
    const address = getRequestAddress(event) as string;

    try {
        const response = await fetch("https://start.schulportal.hessen.de/vertretungsplan.php", {
            redirect: "manual",
            headers: {
                Cookie: `sid=${token}; ${getOptionalSchool(event)}`,
                ...generateDefaultHeaders(address)
            }
        });

        if (hasInvalidSidRedirect(response)) return setErrorResponseEvent(event, 403, STATIC_STRINGS.ROUTE_LOCKED);
        if (hasInvalidAuthentication(response)) return setErrorResponseEvent(event, 401);
        if (hasPasswordResetLocationSet(response)) return setErrorResponseEvent(event, 418, STATIC_STRINGS.PASSWORD_RESET_SET);

        const {
            window: { document }
        } = new JSDOM(removeBreaks(await response.text()));
        const days = querySelectorArray(document, "#content .panel.panel-info:not(#menue_tag), #content .panel.panel-primary");

        const data: VertretungsDay[] = [];
        for (const day of days) {
            const date = day.id.replace(/tag/i, "").split("_");
            // Something must be broken then, so we better just skip over this element
            if (date.length !== 3) continue;
            // year - month - day
            const time = new Date(date.reverse().join("-"));
            const header = day.querySelector(".panel-heading");
            // Relative position of day ("heute", "morgen") and type of week ("A-Woche" or "B-Woche")
            const headerElements = [".badge:not(.woche)", ".badge.woche"].map((element) => header?.querySelector(element));
            // News are kept in descrete boxes called "Allgemein" most often
            // Inside those are more subsections, split by a <hr> element
            // -> thus we need to split at them and later merge all the stuff
            const news = querySelectorArray(day, ".infos > tbody > tr:not(.subheader) > td").map((element) =>
                element.innerHTML
                    .trim()
                    .replace(/ <br> /gi, "<br>")
                    .replace(/(<img)[^>]*(>)/gi, "")
                    .split('<hr style="margin: 0px 2px;">')
            );
            const mergedNews: string[] = new Array<string>().concat(...news);
            // We can assume that the table has the attribute classview, for
            // whatever that may be used for, it is most definetly present
            const table = day.querySelector<HTMLTableElement>("table.table[data-classview]");

            if (table === null) continue;
            const columns = getTableHeaderIndicies(table);

            const vertretungen: Vertretung[] = [];

            const hasNoEntries = table.querySelector(".alert.alert-warning") !== null;
            const rows = querySelectorArray<HTMLElement>(table, "tbody > tr");

            for (const row of rows) {
                if (hasNoEntries) break;
                const data: Record<string, any> = {};
                for (const column of columns) {
                    const value = row.children[column.index].innerHTML.trim();
                    data[column.key] = column.modifier_function ? column.modifier_function(value) : value;
                }
                vertretungen.push(data as Vertretung);
            }

            data.push({
                date: time.getTime(),
                day: date.join("-"),
                day_of_week: DAYS[time.getDay()],
                relative: headerElements[0]?.textContent || "",
                vertretungen,
                news: mergedNews
            });
        }

        return {
            error: false,
            days: data,
            last_updated: parseLastUpdatedString(document),
            updating: isCurrentlyUpdating(document)
        };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});

/**
 * Checks whether the "Der Vertretungsplan wird aktuell aktualisiert!" disclaimer is present.
 *
 * This disclaimer is most often completely useless, but may be nice to know.
 * @param document The document from which to load the element
 * @returns Whether the element is present/the plan is "updating"
 */
function isCurrentlyUpdating(document: Document) {
    // If present, there is a big red alert box allowing the user to press a reload button
    return document.querySelector("#content .alert.alert-danger a[href].btn.btn-primary") !== null;
}

/**
 * Attempts to parse the last updated string on the site to another format.
 * @param document The document from which to load the element
 * @returns Either the sucessfully parsed date or null on failure
 */
function parseLastUpdatedString(document: Document) {
    // The element is attached to the bottom right of any day field
    const element = document.querySelector(".panel:not(#menue_tag) .panel-body .pull-right i:not(.glyphicon)");
    if (element === null) return null;

    // The field is constructed like "Letzte Aktualisierung: dd.mm.yyyy um hh:mm:ss Uhr"
    const matches = element.innerHTML.match(/(\d{2}\.\d{2}\.\d{4})(?: um )(\d{2}:\d{2}:\d{2})/i);
    if (matches === null || matches.length !== 3) return null;

    const day = matches[1].split(".").reverse().join("-");
    const time = matches[2];
    return new Date(`${day} ${time}`).getTime();
}

/**
 * Parses the lessons cell of a table row to the JSON format.
 * @param value The table cell content
 */
function getLessonsOfEntry(value: string) {
    const fromTo = value.split(" - ").map((lesson) => parseInt(lesson));
    if (!fromTo.length) return { list: [], from: -1, to: -1 };
    const lessons: number[] = Array.from({ length: fromTo.length }, (_, k) => fromTo[0] + k);
    return {
        list: lessons,
        from: fromTo[0],
        to: fromTo[fromTo.length - 1]
    };
}

/**
 * Checks the table header passed for all columns in the config.
 * For those found, the corresponding index is set. Config entrys or columns
 * which do not have a counterpart are ignored.
 */
function getTableHeaderIndicies(row: HTMLElement): IndexedColumnConfigKey[] {
    const columnConfig: ColumnConfigKey[] = [
        { name: "Stunde", key: "lessons", modifier_function: getLessonsOfEntry },
        { name: "Klasse", key: "classes" },
        { name: "Vertreter", key: "substitution" },
        { name: "Lehrer", key: "teacher" },
        { name: "Art", key: "type" },
        { name: "Fach", key: "subject" },
        { name: "Fach_alt", key: "subject_old" },
        { name: "Raum", key: "room" },
        { name: "Hinweis", key: "note" }
    ];
    const columns = querySelectorArray(row, "th");
    return columns
        .map((column, index) => {
            const config = columnConfig.find(({ name }) => name === column.getAttribute("data-field"));
            if (!config) return null;
            const { key, modifier_function } = config;
            return { key, modifier_function, index };
        })
        .filter((value) => value !== null);
}

interface IndexedColumnConfigKey {
    /**
     * The index of the column inside the HTML table
     */
    index: number;
    /**
     * The key to which the data should be saved inside the output
     */
    key: string;
    /**
     * The modifier function optionally provided by the ColumnConfigKey
     */
    modifier_function?: (value: string) => any;
}

/**
 * Used to dynamically parse a Vplan table and its columns.
 *
 * If a field specified using this is not found, its value will be set to null.
 */
interface ColumnConfigKey {
    /**
     * The name of the column in the HTML table (set as the data-field attribute on the th element).
     * This determines how the field is recognized by the parser.
     */
    name: string;
    /**
     * The key to which it should be converted in the JSON output
     */
    key: string;
    /**
     * After running a trim on the content of the field, the value is passed to this function.
     * If not present, the value of the field is returned as is. Can be used to i.e. parse a lesson string.
     */
    modifier_function?: (value: string) => any;
}
