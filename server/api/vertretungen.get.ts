import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import { generateDefaultHeaders, hasPasswordResetLocationSet, parseCookie, patterns, removeBreaks, setErrorResponse } from "../utils";
import { JSDOM } from "jsdom";
// Starts on sunday cos Date#getDay does too
const DAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

interface VertretungsDay {
    date: string;
    day: string;
    day_of_week: string;
    relative: string;
    vertretungen: Vertretung[];
    news: string[];
}

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    if (!req.headers.authorization) return setErrorResponse(res, 400, "'authorization' header missing");
    if (!patterns.SID.test(req.headers.authorization)) return setErrorResponse(res, 400, "'authorization' header invalid");

    const rateLimit = handleRateLimit("/api/vertretungen.get", address, req.headers["x-ratelimit-bypass"]);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    try {
        const raw = await fetch("https://start.schulportal.hessen.de/vertretungsplan.php", {
            redirect: "manual",
            headers: {
                Cookie: `sid=${encodeURIComponent(req.headers.authorization)}`,
                ...generateDefaultHeaders(address)
            }
        });

        if (hasPasswordResetLocationSet(raw)) return setErrorResponse(res, 418, "Lege dein Passwort fest");

        const { i } = parseCookie(raw.headers.get("set-cookie") || "");
        // The cookie might either be nonexistent or set to 0 if the user isn't logged in
        if (typeof i === "undefined" || i == "0") return setErrorResponse(res, 401);

        const response: { error: boolean; days: VertretungsDay[]; last_updated: string | null; updating: boolean } = {
            error: false,
            days: [],
            last_updated: null,
            updating: false
        };

        const { window } = new JSDOM(removeBreaks(await raw.text()));
        const days = window.document.querySelectorAll("#content .panel.panel-info:not(#menue_tag), #content .panel.panel-primary");

        // This is basically the "Der Vertretungsplan wird aktuell aktualisiert!" disclaimer, which
        // is most definitely bullshit, but it might still be important to show anyways lol
        response.updating = window.document.querySelector("#content .alert.alert-danger a[href].btn.btn-primary") !== null;

        response.last_updated = (() => {
            const element = window.document.querySelector(".panel:not(#menue_tag) .panel-body .pull-right i:not(.glyphicon)");
            if (element === null) return null;

            const matches = element.innerHTML.match(/(\d{2}\.\d{2}\.\d{4})(?: um )(\d{2}:\d{2}:\d{2})/i);
            if (matches === null || matches.length !== 3) return null;

            const day = matches[1].split(".").reverse().join("-");
            const time = matches[2];
            return `${day} ${time}`;
        })();

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
            const news = Array.from(day.querySelectorAll(".infos > tbody > tr:not(.subheader) > td")).map((element) =>
                element.innerHTML
                    .trim()
                    .replace(/ <br> /gi, "<br>")
                    .replace(/(<img)[^>]*(>)/gi, "")
                    .split('<hr style="margin: 0px 2px;">')
            );
            // @ts-ignore TS does not want to merge a string array into a never
            // array even though we declared the type ¯\_(ツ)_/¯
            const mergedNews: string[] = [].concat(...news);
            // We can assume that the table has the attribute classview, for
            // whatever that may be used for, it is most definetly present (hopefully lol)
            const table = day.querySelector("table.table[data-classview]");
            if (table === null) continue;
            const vertretungen: Vertretung[] = [];

            const hasNoEntries = table.querySelector(".alert.alert-warning") !== null;
            table.querySelectorAll("tbody > tr").forEach((entry) => {
                if (hasNoEntries) return;
                const children = Array.from(entry.children);

                // This has to be done as there might be things like 1 - 10 in lessons
                // which, if we would only convert the two to an array would result in
                // weird behaviour we might not want to have. However we still just
                // give the basic from-to back to the user in the API as seen below
                const fromTo = children[1].innerHTML
                    .trim()
                    .split(" - ")
                    .map((lesson) => parseInt(lesson));
                const lessons: number[] = Array.from({ length: fromTo.length }, (v, k) => fromTo[0] + k);

                vertretungen.push({
                    lessons: {
                        list: lessons,
                        from: fromTo[0],
                        to: fromTo[1]
                    },
                    class: children[2].innerHTML.trim() || null,
                    substitute: children[3].innerHTML.trim() || null,
                    teacher: children[4].innerHTML.trim() || null,
                    subject: children[5].innerHTML.trim() || null,
                    subject_old: children[6].innerHTML.trim() || null,
                    room: children[7].innerHTML.trim() || null,
                    note: children[8].innerHTML.trim() || null
                });
            });
            response.days.push({
                date: time.toString(),
                day: date.join("-"),
                day_of_week: DAYS[time.getDay()],
                relative: headerElements[0]?.textContent || "",
                vertretungen,
                news: mergedNews
            });
        }

        return response;
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});

interface Vertretung {
    lessons: {
        list: number[];
        from: number;
        to: number;
    };
    class: string | null;
    substitute: string | null;
    teacher: string | null;
    subject: string | null;
    subject_old: string | null;
    room: string | null;
    note: string | null;
}
