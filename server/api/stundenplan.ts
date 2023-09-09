import { APIError, generateDefaultHeaders, parseCookie, removeBreaks, setErrorResponse } from "../utils";
import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import { JSDOM } from "jsdom";

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    if (req.method !== "GET") return setErrorResponse(res, 405);

    if (!req.headers.authorization) return setErrorResponse(res, 400, "'authorization' header missing");
    if (!/^[a-z0-9]{26}$/.test(req.headers.authorization)) return setErrorResponse(res, 400, "'authorization' header invalid");

    const rateLimit = handleRateLimit("/api/login", address);
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
        if (raw.status !== 200) throw new APIError("Couldn't load SPlan");

        const { i } = parseCookie(raw.headers.get("set-cookie") || "");
        // The cookie might either be nonexistent or set to 0 if the user isn't logged in
        if (typeof i === "undefined" || i == "0") return setErrorResponse(res, 401);

        const html = removeBreaks(await raw.text());

        const plans: Stundenplan[] = [];

        const { window } = new JSDOM(html);
        const { document } = window;

        const initialPlan: PlanDate = {
            start: document.querySelector("#all .plan")?.getAttribute("data-date") || "",
            end: null,
            current: true
        };

        const selection = document.querySelector("#dateSelect");
        if (selection !== null) {
            for (const option of selection.children) {
                const start = option.getAttribute("value");
                if (!start) continue;
                const plan: PlanDate = { start, end: null, current: false };

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

interface PlanDate {
    start: string;
    end: string | null;
    current?: boolean;
}

async function loadSplanForDate(date: PlanDate, auth: string, load: boolean, address?: string, html?: string): Promise<Stundenplan> {
    if (load) {
        const raw = await fetch("https://start.schulportal.hessen.de/stundenplan.php?a=detail_klasse&date=" + date.start, {
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
        start_date: date.start,
        end_date: date.end,
        current: date.current ?? false,
        lessons: []
    };

    document
        .querySelectorAll(
            "#all .plan table.table.table-hoverRowspan.table-condensed.table-bordered.table-centered tbody tr td:nth-child(1) .VonBis small"
        )
        .forEach((element) => {
            plan.lessons.push(element.innerHTML.split(" - ").map((lesson) => lesson.split(":").map((time) => parseInt(time))));
        });

    document
        .querySelectorAll("#all .plan table.table.table-hoverRowspan.table-condensed.table-bordered.table-centered tbody tr td:not(:nth-child(1))")
        .forEach((element) => {
            if (!element.parentElement || !element.parentElement.parentElement) return;

            const day = Array.from(element.parentElement.children).indexOf(element) - 1;
            const lesson = Array.from(element.parentElement.parentElement.children).indexOf(element.parentElement) + 1;
            const rows = parseInt(element.getAttribute("rowspan") || "1");

            let iterator = 1;
            const classes: Class[] = [];
            for (const entry of element.children) {
                let room: any = "";
                for (const child of entry.childNodes) {
                    const content = child.textContent?.trim();
                    if (child.nodeName !== "#text" || !content) continue;
                    room = child.textContent?.trim();
                }

                const name = entry.querySelector("b")?.innerHTML.trim() || "";
                const teacher = entry.querySelector("small")?.innerHTML.trim() || "";

                classes.push({ name: name, room: room, teacher: teacher });
                iterator++;
            }

            const lessons: number[] = rows === 2 ? [lesson, lesson + 1] : [lesson];
            plan.days[day].lessons.push({ lessons: lessons, classes: classes });
        });

    for (const day of plan.days) {
        const index = plan.days.indexOf(day);
        for (const lesson of day.lessons) {
            const found = findDayWithEmptyLesson(plan, index, lesson.lessons);
            if (!found) continue;

            plan.days[index].lessons.splice(plan.days[index].lessons.indexOf(lesson), 1);
            plan.days[found].lessons.push(lesson);
        }

        day.lessons.sort((a, b) => {
            if (a.lessons[0] < b.lessons[0]) return -1;
            if (a.lessons[0] > b.lessons[0]) return 1;
            return 0;
        });
    }

    return plan;
}

function findDayWithEmptyLesson(plan: Stundenplan, day: number, lessons: number[]): number {
    for (let i = day; i < 5; i++) {
        let occupied = false;
        for (const lesson of lessons) {
            // This indicates that on that day, another lesson already
            // occupied that specific time slot and thus we need to
            // look one day further!
            if (plan.days[i].lessons.find((x) => x.lessons.includes(lesson))) occupied = true;
        }

        if (!occupied) return i;
    }

    // This should only act as a fallback in case
    // no other empty day could be found in the list
    return day;
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
