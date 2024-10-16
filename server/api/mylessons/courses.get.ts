import { defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { BasicResponse, generateDefaultHeaders, patterns, removeBreaks, getOptionalSchool, setErrorResponseEvent } from "../../utils";
import { JSDOM } from "jsdom";
import cryptoJS from "crypto-js";
import { hasInvalidAuthentication, hasInvalidSidRedirect, hasPasswordResetLocationSet } from "~/server/failsafe";
import { SchemaEntryConsumer, validateQueryNew } from "~/server/validator";
import { MyLessonsAllCourses, MyLessonsCourseGlobal } from "~/common/mylessons";

const querySchema: SchemaEntryConsumer = {
    token: { required: true, pattern: patterns.SID },
    session: { required: true, pattern: patterns.SESSION_OR_AUTOLOGIN },
    key: { required: false, pattern: patterns.AES_PASSWORD }
};

interface Response extends BasicResponse, MyLessonsAllCourses {}

const rlHandler = defineRateLimit({ interval: 15, allowed_per_interval: 3 });
export default defineEventHandler<Promise<Response>>(async (event) => {
    const query = getQuery<{ token: string; session: string; key?: string }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponseEvent(event, 400, queryValidation);

    const rl = rlHandler(event);
    if (rl !== null) return rl;
    const address = getRequestAddress(event);

    const { token, session, key } = query;

    try {
        const response = await fetch("https://start.schulportal.hessen.de/meinunterricht.php", {
            headers: {
                Cookie: `sid=${token}; SPH-Session=${session}; ${getOptionalSchool(event)}`,
                ...generateDefaultHeaders(address)
            },
            redirect: "manual",
            method: "GET"
        });

        if (hasInvalidSidRedirect(response)) return setErrorResponseEvent(event, 403, "Route gesperrt");
        if (hasInvalidAuthentication(response)) return setErrorResponseEvent(event, 401);
        if (hasPasswordResetLocationSet(response)) return setErrorResponseEvent(event, 418, "Lege dein Passwort fest");

        const {
            window: { document }
        } = new JSDOM(removeBreaks(await response.text()));

        const courses: MyLessonsCourseGlobal[] = [];
        const expired: MyLessonsCourseGlobal[] = [];
        document.querySelectorAll("#mappen[role=tabpanel] .thumbnail").forEach((thumbnail) => {
            const button = thumbnail.querySelector("button[title]");
            if (button === null) return;

            const teacher = {
                full: button.getAttribute("title"),
                short: button.textContent?.trim() || null
            };
            const subject = thumbnail.querySelector("h2 span")?.innerHTML || null;
            // The ID is stored in the link under "meinunterricht.php?a=sus_view?id=1000"
            const id = parseInt(thumbnail.querySelector("a.btn")?.getAttribute("href")?.split("meinunterricht.php?a=sus_view&id=")[1] || "0");

            courses.push({ teacher, subject, id });
        });

        document.querySelectorAll("#mappen[role=tabpanel] table.table tr[data-entry]").forEach((course) => {
            const teacherElement = course.querySelector("td:nth-child(2) span");
            if (teacherElement === null) return;

            const teacher = {
                full: teacherElement.getAttribute("title"),
                short: teacherElement.textContent?.trim() || null
            };
            const subject = course.querySelector("td:first-child a")?.textContent?.trim() || null;
            const id = parseInt(course.getAttribute("data-book") || "0");

            expired.push({ teacher, subject, id });
        });

        // All the types that may exist (fehlend, entschuldigt, anwesend, etc.)
        // The first two columns are the subject and the teacher, thus we start at 3rd
        const attendanceTypes = Array.from(document.querySelectorAll("#anwesend[role=tabpanel] table.table thead th:nth-child(n+3)")).map(
            (element) => element.innerHTML
        );

        document.querySelectorAll("#anwesend[role=tabpanel] table.table tbody tr").forEach((course) => {
            if (!key) return;
            const link = course.querySelector("td:first-child a")?.getAttribute("href");
            if (!link) return;

            const courseId = link.match(/(?:meinunterricht.php\?a=sus_view&id=)(\d+)/i)?.at(1);

            const encoded = Array.from(course.querySelectorAll("td:nth-child(n+3) encoded")).map((element) => element.innerHTML);
            if (!courseId || !encoded) return;

            const courseIndex = courses.findIndex((x) => x.id === parseInt(courseId));
            if (courseIndex === -1) return;

            const attendance: { [type: string]: number } = {};

            // We decode all the given attendances and get the clean strings from them
            // veery ugly task but it's just better in one operation
            const decodes = encoded.map((encrypted) => removeBreaks(Buffer.from(cryptoJS.AES.decrypt(encrypted, key).toString(), "hex").toString()));
            // Removing some gibberish that probably is some salting stuff
            decodes
                .map((string) => parseInt(string.replace(/<div class="hidden hidden_encoded">[a-f0-9]{32}<\/div>/, "").trim()))
                .forEach((count, index) => (attendance[attendanceTypes[index]] = count));

            courses[courseIndex] = { ...courses[courseIndex], attendance };
        });

        document.querySelectorAll("#aktuell[role=tabpanel] #aktuellTable tbody tr").forEach((course) => {
            const courseId = parseInt(course.getAttribute("data-book") || "0");
            const courseIndex = courses.findIndex((x) => x.id === courseId);

            const lesson = parseInt(course.getAttribute("data-entry") || "") || null;
            if (courseIndex === -1) return;

            // That cell is used for all information, it is thus easier to just
            // store it here instead of querying for it for literally everything
            const cell = course.querySelector("td:nth-child(2)");
            if (cell === null) return;

            const topic = cell.querySelector(".thema")?.innerHTML || null;
            // If we take the German date, we would get something like 31.12.2000 (dd.mm.yyyy), which
            // wouldn't get parsed correctly by the Date constructor, so we convert it to yyyy-mm-dd
            const date = cell.querySelector("span.datum")?.innerHTML.split(".").reverse().join("-") || null;
            const hasHomework = cell.querySelector(".homework") !== null;
            // That is the class of the container of the "als erledigt markieren" button
            const homeworkDone = cell.querySelector(".undone") === null;
            const homework = cell.querySelector(".realHomework")?.innerHTML || null;

            courses[courseIndex] = {
                ...courses[courseIndex],
                last_lesson: {
                    topic,
                    date,
                    description: null,
                    entry: lesson,
                    homework: hasHomework ? { done: homeworkDone, description: homework } : null,
                    // Both of these are not yet implemented in this system
                    uploads: null,
                    downloads: null
                }
            };
        });

        return { error: false, courses, expired };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
