import { MyLessonsCourse } from "~/server/mylessons";
import { RateLimitAcceptance, handleRateLimit } from "../../ratelimit";
import { generateDefaultHeaders, parseCookie, patterns, removeBreaks, setErrorResponse } from "../../utils";
import { JSDOM } from "jsdom";

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    if (!req.headers.authorization) return setErrorResponse(res, 400, "'authorization' header missing");
    if (!patterns.SID.test(req.headers.authorization)) return setErrorResponse(res, 400, "'authorization' header invalid");

    const rateLimit = handleRateLimit("/api/mylessons/courses.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    try {
        const raw = await fetch("https://start.schulportal.hessen.de/meinunterricht.php", {
            headers: {
                Cookie: `sid=${encodeURIComponent(req.headers.authorization)}`,
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
            const link = course.querySelector("td:first-child a")?.getAttribute("href");
            if (!link) return;

            console.log(link);

            const id = link.match(/(?:meinunterricht.php\?a=sus_view&id=)(\d+)/i)?.at(1);
            console.log(course.innerHTML);
            const attendance = course.querySelector("td:last-child")?.childNodes[2].textContent?.trim();
            if (!id || !attendance) return;

            const courseIndex = courses.findIndex((x) => x.id === parseInt(id));
            courses[courseIndex] = { ...courses[courseIndex], attendance: parseInt(attendance) };
        });

        return { error: false, courses, expired };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
