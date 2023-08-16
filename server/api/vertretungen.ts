import { APIError, generateForwardedHeader, removeBreaks, setErrorResponse } from "../utils";
import { JSDOM } from "jsdom";
const ROW_ORDER = ["empty", "lesson", "class", "substitute", "teacher", "subject", "subject_old", "room", "note"];
// Starts on sunday cos Date#getDay does too
const DAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    if (req.method !== "GET") return setErrorResponse(res, 405);

    if (!req.headers.authorization) return setErrorResponse(res, 400, "'authorization' header missing");

    try {
        const raw = await fetch("http://localhost/vertretungsplan.html", {
            headers: [["Cookie", `sid=${encodeURIComponent(req.headers.authorization)}`], generateForwardedHeader(address)]
        });

        if (raw.status !== 200) throw new APIError("Couldn't load VPlan");

        const response: { error: boolean; days: any[]; last_updated: string } = {
            error: false,
            days: [],
            last_updated: ""
        };

        const { window } = new JSDOM(removeBreaks(await raw.text()));
        const days = window.document.querySelectorAll("#content .panel");

        for (const day of days) {
            const date = day.id.replace(/tag/i, "").split("_");
            // Something must be broken then, so we better just skip over this element
            if (date.length !== 3) continue;
            // month - day - year
            const time = new Date(`${date[1]}/${date[0]}/${date[2]}`);
            const header = day.querySelector(".panel-heading");
            // Relative position of day ("heute", "morgen") and type of week ("A-Woche" or "B-Woche")
            const headerElements = [".badge:not(.woche)", ".badge.woche"].map((element) => header?.querySelector(element));
            const news = Array.from(day.querySelectorAll(".infos > tbody > tr:not(.subheader) > td")).map((element) =>
                element.innerHTML
                    .trim()
                    .replace(/ <br> /gi, "<br>")
                    .replace(/(<img)[^>]*(>)/gi, "")
            );
            response.days.push({
                date: date.join("."),
                day_of_week: DAYS[time.getDay()],
                relative: headerElements[0]?.textContent || "",
                vertretungen: [],
                news
            });
        }

        return response;
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 503);
    }
});

interface Vertretung {
    lesson: string;
    class: string;
    substitute: string;
    teacher: string;
    subject: string;
    subject_old: string;
    room: string;
    note: string;
}
