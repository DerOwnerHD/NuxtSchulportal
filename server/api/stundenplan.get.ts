import {
    generateDefaultHeaders,
    getAuthToken,
    removeBreaks,
    getOptionalSchool,
    BasicResponse,
    STATIC_STRINGS,
    setErrorResponseEvent
} from "../utils";
import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { JSDOM } from "jsdom";
import { hasInvalidAuthentication, hasInvalidSidRedirect, hasPasswordResetLocationSet } from "~/server/failsafe";
import { querySelectorArray } from "../dom";
import { Stundenplan, StundenplanLesson } from "~/common/stundenplan";

interface Response extends BasicResponse {
    plans: Stundenplan[];
}

const rlHandler = defineRateLimit({ interval: 15, allowed_per_interval: 3 });

export default defineEventHandler<Promise<Response>>(async (event) => {
    const token = getAuthToken(event);
    if (token === null) return setErrorResponseEvent(event, 400, STATIC_STRINGS.INVALID_TOKEN);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);
    const address = getRequestAddress(event) as string;

    const school = getOptionalSchool(event) as string;

    try {
        // Note: this redirects us to the currently active plan
        // => its link would have the start date in it and we do not
        // need to load its html inside the parse function
        const response = await fetch("https://start.schulportal.hessen.de/stundenplan.php", {
            headers: {
                Cookie: `sid=${token}; ${school}`,
                ...generateDefaultHeaders(address)
            }
        });

        if (hasInvalidSidRedirect(response)) return setErrorResponseEvent(event, 403, "Route gesperrt");
        if (hasInvalidAuthentication(response)) return setErrorResponseEvent(event, 401);
        if (hasPasswordResetLocationSet(response)) return setErrorResponseEvent(event, 418, "Lege dein Passwort fest");

        const html = removeBreaks(await response.text());
        const {
            window: { document }
        } = new JSDOM(html);
        const plans: Stundenplan[] = [];

        const initialPlanOptions: PlanOptions = {
            start: document.querySelector("#all .plan")?.getAttribute("data-date") ?? "",
            end: null,
            current: true
        };

        const fetchOptions = {
            token,
            school,
            address
        };

        const selection = document.querySelector("#dateSelect");
        if (selection !== null) {
            // These are all the various plans NOT selected at the right now
            // => future plans (not active yet)
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
                        initialPlanOptions.end = transformed;
                        continue;
                    }

                    plan.end = transformed;
                }

                const data = await loadSplanForDate(plan, fetchOptions);
                if (data === null) continue;
                plans.push(data);
            }
        }

        // The current plan we've been redirected to
        const initialPlan = await loadSplanForDate(initialPlanOptions, fetchOptions);
        if (initialPlan !== null) plans.push(initialPlan);

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
        return setErrorResponseEvent(event, 500);
    }
});

interface PlanOptions {
    /**
     * The start date of the plan. Always defined.
     */
    start: string;
    /**
     * The end date of the plan. May not always be defined, most often
     * only when another plan after it is already defined
     */
    end: string | null;
    /**
     * Whether the plan is currently selected. Parsed from the HTML of the initial plan response.
     */
    current?: boolean;
    /**
     * A reference to a Document only used for the initial plan.
     * If this is present, the plan is not manually fetched anymore
     */
    document?: Document;
}

/**
 * Fetches a plan using a provided start date.
 * List of plan start/end dates is retrieved by first fetching the main /stundenplan.php page.
 * @param options Options for the plan (used for the url with the start date)
 * @param token Token of the user
 * @param address
 * @param school
 * @returns
 */
async function fetchIndividualPlan(options: PlanOptions, fetchOptions: FetchOptions) {
    try {
        const response = await fetch(`https://start.schulportal.hessen.de/stundenplan.php?a=detail_klasse&date=${options.start}`, {
            method: "GET",
            redirect: "error",
            headers: {
                Cookie: `sid=${fetchOptions.token}; ${fetchOptions.school}`,
                ...generateDefaultHeaders(fetchOptions.address)
            }
        });
        return await response.text();
    } catch {
        return null;
    }
}

interface FetchOptions {
    token: string;
    address?: string;
    school?: string;
}

async function loadSplanForDate(options: PlanOptions, fetchOptions: FetchOptions): Promise<Stundenplan | null> {
    const response = !options.document ? await fetchIndividualPlan(options, fetchOptions) : null;
    if (!options.document && response === null) return null;
    const document = options.document ?? new JSDOM(response as string).window.document;

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
        lessons: querySelectorArray(document, "#all .plan table.table tbody tr td:first-child .VonBis small").map((element) =>
            element.innerHTML.split(" - ").map((lesson) => lesson.split(":").map((time) => parseInt(time)))
        )
    };

    // For some reason, there is an empty row at the first spot
    // -> thus we skip that first child element (tr)
    querySelectorArray(document, "#all .plan table.table tbody tr:not(:first-child)").forEach((lessons, index) => {
        // Normally, it would always have 6 children (lesson and all the days)
        // But if there are double lessons, there will only be one td item
        // Thus, if this is the case, we need to make sure we use the correct
        // day by checking for it when pushing to the day of the week
        const checkForOccupiedSlots = lessons.children.length < 6;

        let day = 0;
        // We slice off the first element of the row to remove the info label
        for (const lesson of Array.from(lessons.children).slice(1)) {
            // If this is greater than one, we would
            // have a lesson which spans two or more hours
            const span = parseInt(lesson.getAttribute("rowspan") || "1");

            const stunde: StundenplanLesson = {
                // This fills the array with all the lessons along the span
                lessons: Array.from({ length: span }, (v, k) => index + k + 1),
                classes: querySelectorArray(lesson, "div.stunde").map((element) => {
                    const title = element.getAttribute("title")?.trim() || "";
                    const properties = title?.match(/(.*)(?: im Raum )(.*)(?: bei der Klasse\/Stufe\/Lerngruppe )(.*)/);
                    // We expect to recieve the subject, the room and the class (not used currently)
                    if (properties === null || properties.length !== 4) return { teacher: "", name: "", room: "" };

                    return {
                        teacher: element.querySelector("small")?.innerHTML.trim() ?? "",
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

            plan.days[day].lessons.push(stunde);
            day++;
        }
    });

    // We merge the lessons by going from bottom to top
    // This eliminates the risk of modifying the indicies we still need to go to
    // -> if we delete from the bottom, it make no difference to index up top
    // Although it would seem inefficient to loop at the end through the array
    // once more, the performance aspect is minimal (way less than 1ms)
    for (const day of plan.days) {
        // We set the last index checked to 1 by design, as index 0
        // has no need to be checked as it is (obviously) the first lesson
        for (let i = day.lessons.length - 1; i > 0; i--) {
            const lesson = day.lessons[i];
            const previous = day.lessons[i - 1];
            const stringified = [lesson, previous].map((data) => JSON.stringify(data.classes));
            if (stringified[0] === stringified[1]) {
                day.lessons[i - 1].lessons = [...previous.lessons, ...lesson.lessons];
                day.lessons.splice(i, 1);
            }
        }
    }

    return plan;
}
