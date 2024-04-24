import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import {
    authHeaderOrQuery,
    generateDefaultHeaders,
    hasInvalidAuthentication,
    hasPasswordResetLocationSet,
    removeBreaks,
    schoolFromRequest,
    setErrorResponse
} from "../utils";
import { JSDOM } from "jsdom";

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const token = authHeaderOrQuery(event);
    if (token === null) return setErrorResponse(res, 400, "Token not provided or malformed");

    const rateLimit = handleRateLimit("/api/oberstufenwahl.get", address, req.headers["x-ratelimit-bypass"]);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    try {
        const response = await fetch("https://start.schulportal.hessen.de/oberstufenwahl.php", {
            redirect: "manual",
            headers: {
                Cookie: `sid=${token}; ${schoolFromRequest(event)}`,
                ...generateDefaultHeaders(address)
            }
        });

        if (hasInvalidAuthentication(response)) return setErrorResponse(res, 401);
        if (hasPasswordResetLocationSet(response)) return setErrorResponse(res, 418, "Lege dein Passwort fest");

        const {
            window: { document }
        } = new JSDOM(removeBreaks(await response.text()));

        const elections = Array.from(document.querySelectorAll(".container #content .panel")).map((panel) => {
            const title = panel.querySelector(".panel-heading h3.panel-title")?.innerHTML ?? null;
            const durationString = panel.querySelector(".panel-body")?.textContent?.trim();
            // Nothing we can do if there ain't any duration
            // Should be formatted like "Teilnahme vom dd.mm.yyyy um hh:mm Uhr bis dd.mm.yyyy um hh:mm Uhr"
            if (typeof durationString !== "string") return null;
            const dates = durationString.replace("Teilnahme vom ", "").split(" bis ");
            // We would expect there to be a start and end date
            if (dates.length !== 2) return null;
            const dateAndTime = dates.map((date) => date.split(" um "));
            const dateObjects = dateAndTime.map((splitted) => {
                const date = splitted[0].split(".").reverse().join("-");
                const time = splitted[1].replace(" Uhr", "");
                return new Date(date + " " + time).toString();
            });
            const button = panel.querySelector(".panel-footer a.btn");
            // @ts-ignore
            const id = parseInt(button?.getAttribute("href")?.replace("oberstufenwahl.php?a=abgabe&w=", "")) || null;
            // If the ID should turn out to be nonexistent,
            // we can assume the thing already has been completed
            return { title, start: dateObjects[0], end: dateObjects[1], id };
        });

        return { error: false, elections: elections.filter((x) => x !== null) };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
