import { MyLessonsCourse } from "~/server/mylessons";
import { RateLimitAcceptance, handleRateLimit } from "../../ratelimit";
import { generateDefaultHeaders, parseCookie, patterns, removeBreaks, setErrorResponse, transformEndpointSchema, validateQuery } from "../../utils";
import { JSDOM } from "jsdom";
import cryptoJS from "crypto-js";

const schema = {
    query: {
        token: { required: true, pattern: patterns.SID },
        session: { required: true, pattern: patterns.SESSION_OR_AUTOLOGIN },
        key: { required: false, pattern: patterns.AES_PASSWORD }
    }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const query = getQuery<{ token: string; session: string; key?: string }>(event);
    const valid = validateQuery(query, schema.query);
    if (!valid) return setErrorResponse(res, 400, transformEndpointSchema(schema));

    const rateLimit = handleRateLimit("/api/mylessons/courses.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { token, session, key } = query;

    try {
        const raw = await fetch("https://start.schulportal.hessen.de/meinunterricht.php", {
            headers: {
                Cookie: `sid=${token}; SPH-Session=${session}`,
                ...generateDefaultHeaders(address)
            },
            redirect: "manual",
            method: "GET"
        });

        const { i } = parseCookie(raw.headers.get("set-cookie") || "");
        // The cookie might either be nonexistent or set to 0 if the user isn't logged in
        if (typeof i === "undefined" || i == "0") return setErrorResponse(res, 401);

        const html = removeBreaks(await raw.text());
        const { window } = new JSDOM(html);
        const { document } = window;

        const courses: MyLessonsCourse[] = [];
        const expired: MyLessonsCourse[] = [];
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

        document.querySelectorAll("#anwesend[role=tabpanel] table.table tbody tr").forEach((course) => {
            if (!key) return;
            const link = course.querySelector("td:first-child a")?.getAttribute("href");
            if (!link) return;

            const courseId = link.match(/(?:meinunterricht.php\?a=sus_view&id=)(\d+)/i)?.at(1);

            const attendance = course.querySelector("td:last-child encoded")?.innerHTML;
            if (!courseId || !attendance) return;

            const courseIndex = courses.findIndex((x) => x.id === parseInt(courseId));
            if (courseIndex === -1) return;

            const decoded = cryptoJS.AES.decrypt(attendance, key?.toString() || "");
            const string = removeBreaks(Buffer.from(decoded.toString(), "hex").toString());

            const counter = parseInt(string.replace(/<div class="hidden hidden_encoded">[a-f0-9]{32}<\/div>/, "").trim());

            courses[courseIndex] = { ...courses[courseIndex], attendance: counter };
        });

        document.querySelectorAll("#aktuell[role=tabpanel] #aktuellTable tbody tr").forEach((course) => {
            const courseId = parseInt(course.getAttribute("data-book") || "0");
            const courseIndex = courses.findIndex((x) => x.id === courseId);

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
                last_lesson: { topic, date, homework: hasHomework ? { done: homeworkDone, description: homework } : null }
            };
        });

        return { error: false, courses, expired };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
