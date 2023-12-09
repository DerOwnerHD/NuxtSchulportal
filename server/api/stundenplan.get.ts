import { APIError, generateDefaultHeaders, hasPasswordResetLocationSet, parseCookie, patterns, removeBreaks, setErrorResponse } from "../utils";
import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import { JSDOM } from "jsdom";

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    if (!req.headers.authorization) return setErrorResponse(res, 400, "'authorization' header missing");
    if (!patterns.SID.test(req.headers.authorization)) return setErrorResponse(res, 400, "'authorization' header invalid");

    const rateLimit = handleRateLimit("/api/stundenplan.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    try {
        // We don't want to follow redirects cause in case
        // we aren't logged in and should get redirected, we
        // want to prevent this unhandled behaviour
        const raw = await fetch("https://start.schulportal.hessen.de/stundenplan.php", {
            headers: {
                Cookie: `sid=${encodeURIComponent(req.headers.authorization)}`,
                ...generateDefaultHeaders(address)
            },
            redirect: "follow"
        });

        // There might be a redirect, as the server might be down
        // Even if there is no logged in user, the server will still 200
        if (hasPasswordResetLocationSet(raw)) return setErrorResponse(res, 418, "Lege dein Passwort fest");

        const { i } = parseCookie(raw.headers.get("set-cookie") || "");
        // The cookie might either be nonexistent or set to 0 if the user isn't logged in
        if (typeof i === "undefined" || i == "0") return setErrorResponse(res, 401);

        const html = removeBreaks(await raw.text());

        const plans: Stundenplan[] = [];

        const { window } = new JSDOM(html);
        const { document } = window;

        const initialPlan: PlanOptions = {
            start: document.querySelector("#all .plan")?.getAttribute("data-date") || "",
            end: null,
            current: true
        };

        const selection = document.querySelector("#dateSelect");
        if (selection !== null) {
            for (const option of selection.children) {
                const start = option.getAttribute("value");
                if (!start) continue;
                const plan: PlanOptions = { start, end: null, current: false };

                const match = option.innerHTML.match(/(?:\(bis )(\d{2}\.\d{2}\.\d{4})/i);
                if (match !== null && match[1]) {
                    const transformed = match[1].split(".").reverse().join("-");

                    // The selected one is always the current plan (which is already fetched)
                    // Thus it should have an end date stored here, which we are attempting to get
                    if (option.hasAttribute("selected")) {
                        initialPlan.end = transformed;
                        continue;
                    }

                    plan.end = transformed;
                }

                plans.push(await loadSplanForDate(plan, req.headers.authorization, true, address));
            }
        }

        plans.push(await loadSplanForDate(initialPlan, req.headers.authorization, false, address, html));

        return {
            error: false,
            plans: plans.sort((a, b) => {
                if (a.current) return -1;

                const starts = [a, b].map((plan) => new Date(plan.start_date));
                if (starts[0] > starts[1]) return 1;
                if (starts[0] < starts[1]) return -1;

                return 0;
            })
        };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});

interface PlanOptions {
    start: string;
    end: string | null;
    current?: boolean;
}

async function loadSplanForDate(options: PlanOptions, auth: string, load: boolean, address?: string, html?: string): Promise<Stundenplan> {
    if (load) {
        const raw = await fetch("https://start.schulportal.hessen.de/stundenplan.php?a=detail_klasse&date=" + options.start, {
            method: "GET",
            headers: {
                Cookie: `sid=${encodeURIComponent(auth)}`,
                ...generateDefaultHeaders(address)
            }
        });

        html = removeBreaks(await raw.text());
    }

    const { window } = new JSDOM(html);
    const { document } = window;

    const plan: Stundenplan = {
        days: [
            { name: "Montag", lessons: [] },
            { name: "Dienstag", lessons: [] },
            { name: "Mittwoch", lessons: [] },
            { name: "Donnerstag", lessons: [] },
            { name: "Freitag", lessons: [] }
        ],
        start_date: options.start,
        end_date: options.end,
        current: options.current ?? false,
        lessons: Array.from(document.querySelectorAll("#all .plan table.table tbody tr td:first-child .VonBis small")).map((element) =>
            element.innerHTML.split(" - ").map((lesson) => lesson.split(":").map((time) => parseInt(time)))
        )
    };

    document.querySelectorAll("#all .plan table.table tbody tr").forEach((lessons, index) => {
        // Normally, it would always have 6 children (lesson and all the days)
        // But if there are double lessons, there will only be one td item
        // Thus, if this is the case, we need to make sure we use the correct
        // day by checking for it when pushing to the day of the week
        const checkForOccupiedSlots = lessons.children.length < 6;

        let day = 0;
        for (const lesson of Array.from(lessons.children).slice(1)) {
            // If this is greater than one, we would
            // have a lesson which spans two or more hours
            const span = parseInt(lesson.getAttribute("rowspan") || "1");

            const stunde: Stunde = {
                lessons: Array.from({ length: span }, (v, k) => index + k + 1),
                classes: Array.from(lesson.querySelectorAll("div.stunde")).map((element) => {
                    const title = element.getAttribute("title")?.trim() || "";
                    const properties = title?.match(/(.*)(?: im Raum )(.*)(?: bei der Klasse\/Stufe\/Lerngruppe )(.*)/);
                    // We expect to recieve the subject, the room and the class (not used currently)
                    if (properties === null || properties.length !== 4) return { teacher: "", name: "", room: "" };

                    return {
                        teacher: element.querySelector("small")?.innerHTML.trim() || "",
                        name: properties[1],
                        room: properties[2]
                    };
                })
            };

            // If we need to check the slots of the days, we first
            // go through all days ON and AFTER the current index of days
            // and after that we go through that day to find the first
            // day that does NOT occupy that lesson
            if (checkForOccupiedSlots) {
                for (let i = day; i < 6; i++) {
                    const lessons = plan.days[i].lessons.reduce((acc: number[], stunde) => (acc = [...acc, ...stunde.lessons]), []);
                    const occupiedLessonsOfStunde = stunde.lessons.filter((lesson) => lessons.includes(lesson));
                    if (occupiedLessonsOfStunde.length) continue;

                    day = i;
                    break;
                }
            }

            plan.days.at(day)?.lessons.push(stunde);
            day++;
        }
    });

    return plan;
}

interface Stunde {
    lessons: number[];
    classes: Class[];
}

interface Class {
    teacher: string;
    room: string;
    name: string;
}

interface Stundenplan {
    days: Day[];
    start_date: string;
    end_date: string | null;
    lessons: number[][][];
    current: boolean;
}

interface Day {
    name: "Montag" | "Dienstag" | "Mittwoch" | "Donnerstag" | "Freitag";
    lessons: Stunde[];
}
