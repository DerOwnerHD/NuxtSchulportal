import { Oberstufenwahl } from "~/common/oberstufenwahl";
import { querySelectorArray } from "../dom";
import { hasInvalidAuthentication, hasInvalidSidRedirect, hasPasswordResetLocationSet } from "~/server/failsafe";
import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import {
    getAuthToken,
    generateDefaultHeaders,
    removeBreaks,
    getOptionalSchool,
    setErrorResponseEvent,
    STATIC_STRINGS,
    BasicResponse
} from "../utils";
import { JSDOM } from "jsdom";

interface Response extends BasicResponse {
    elections: Oberstufenwahl[];
}

const rlHandler = defineRateLimit({ interval: 15, allowed_per_interval: 3 });
export default defineEventHandler<Promise<Response>>(async (event) => {
    const token = getAuthToken(event);
    if (token === null) return setErrorResponseEvent(event, 400, STATIC_STRINGS.INVALID_TOKEN);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);

    const address = getRequestAddress(event);

    try {
        const response = await fetch("https://start.schulportal.hessen.de/oberstufenwahl.php", {
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

        const elections: Oberstufenwahl[] = querySelectorArray(document, ".container #content .panel")
            .map((panel) => {
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
            })
            .filter((x) => x !== null);

        return { error: false, elections };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
