import { hasInvalidAuthentication, hasInvalidSidRedirect, hasPasswordResetLocationSet } from "~/server/failsafe";
import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { generateDefaultHeaders, removeBreaks, setErrorResponseEvent, getAuthToken, getOptionalSchool, STATIC_STRINGS } from "../utils";
import { JSDOM } from "jsdom";

const rlHandler = defineRateLimit({ interval: 60, allowed_per_interval: 2 });
export default defineEventHandler(async (event) => {
    const token = getAuthToken(event);
    if (token === null) return setErrorResponseEvent(event, 400, STATIC_STRINGS.INVALID_TOKEN);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);
    const address = getRequestAddress(event);

    try {
        const response = await fetch("https://start.schulportal.hessen.de/lerngruppen.php", {
            method: "GET",
            redirect: "manual",
            headers: {
                Cookie: `sid=${token}; ${getOptionalSchool(event)}`,
                ...generateDefaultHeaders(address)
            }
        });

        if (hasInvalidSidRedirect(response)) return setErrorResponseEvent(event, 403, "Route gesperrt");
        if (hasInvalidAuthentication(response)) return setErrorResponseEvent(event, 401);
        if (hasPasswordResetLocationSet(response)) return setErrorResponseEvent(event, 418, "Lege dein Passwort fest");

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
        return setErrorResponseEvent(event, 500);
    }
});
