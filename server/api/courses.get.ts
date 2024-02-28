import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import {
    generateDefaultHeaders,
    hasInvalidAuthentication,
    hasPasswordResetLocationSet,
    patterns,
    removeBreaks,
    setErrorResponse,
    transformEndpointSchema,
    validateQuery
} from "../utils";
import { JSDOM } from "jsdom";

const schema = {
    query: {
        token: { required: true, pattern: patterns.SID }
    }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const query = getQuery<{ token: string }>(event);
    if (!validateQuery(query, schema.query)) return setErrorResponse(res, 400, transformEndpointSchema(schema));

    const rateLimit = handleRateLimit("/api/courses.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { token } = query;

    try {
        const response = await fetch("https://start.schulportal.hessen.de/lerngruppen.php", {
            method: "GET",
            redirect: "manual",
            headers: {
                ...generateDefaultHeaders(address),
                Cookie: `sid=${token}`
            }
        });

        if (hasInvalidAuthentication(response)) return setErrorResponse(res, 401);
        if (hasPasswordResetLocationSet(response)) return setErrorResponse(res, 418, "Lege dein Passwort fest");

        const {
            window: { document }
        } = new JSDOM(removeBreaks(await response.text()));
        const rows = Array.from(document.querySelectorAll("table#LGs tbody tr")).map((row) => {
            const id = parseInt(row.getAttribute("data-id")!) || null;
            const semester = row.children[0]?.innerHTML || null;
            const subject = row.querySelector("td:nth-child(2) small")?.innerHTML || null;
            const course =
                row
                    .querySelector("td:nth-child(2)")
                    ?.textContent?.replace(subject || "", "")
                    .trim() || null;
            const teacher = row.querySelector("td:last-child")?.textContent?.trim();
            const teacherImage = row.querySelector("td:last-child img")?.getAttribute("src") || null;
            return { id, semester, course, subject: subject?.replace(/\(|\)/g, ""), teacher: { name: teacher, image: teacherImage } };
        });
        return {
            error: false,
            courses: rows
        };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
