import { MyLessonsCourse } from "~/server/mylessons";
import { RateLimitAcceptance, handleRateLimit } from "../../ratelimit";
import { generateDefaultHeaders, parseCookie, patterns, removeBreaks, setErrorResponse, transformEndpointSchema, validateQuery } from "../../utils";
import { JSDOM } from "jsdom";
import cryptoJS from "crypto-js";

const schema = {
    query: {
        token: { required: true, pattern: patterns.SID },
        session: { required: true, pattern: patterns.SESSION_OR_AUTOLOGIN },
        key: { required: true, pattern: patterns.AES_PASSWORD }
    }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const query = getQuery(event);
    const valid = validateQuery(query, schema.query);
    if (!valid) return setErrorResponse(res, 400, transformEndpointSchema(schema));

    const rateLimit = handleRateLimit("/api/mylessons/courses.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { token, session, key } = query;

    try {
        const raw = await fetch("https://start.schulportal.hessen.de/meinunterricht.php", {
            headers: {
                Cookie: `sid=${token?.toString()}; SPH-Session=${session?.toString()}`,
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

            const id = link.match(/(?:meinunterricht.php\?a=sus_view&id=)(\d+)/i)?.at(1);
            const attendance = course.querySelector("td:last-child encoded")?.innerHTML;
            if (!id || !attendance) return;

            const decoded = cryptoJS.AES.decrypt(attendance, key?.toString() || "");
            const string = removeBreaks(Buffer.from(decoded.toString(), "hex").toString());

            const counter = parseInt(string.replace(/<div class="hidden hidden_encoded">[a-f0-9]{32}<\/div>/, "").trim());

            const courseIndex = courses.findIndex((x) => x.id === parseInt(id));
            courses[courseIndex] = { ...courses[courseIndex], attendance: counter };
        });

        return { error: false, courses, expired };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
