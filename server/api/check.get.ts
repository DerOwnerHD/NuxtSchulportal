import { defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { BasicResponse, STATIC_STRINGS, getAuthToken, generateDefaultHeaders, getOptionalSchool, setErrorResponseEvent } from "../utils";
import { Nullable } from "~/common";

interface Response extends BasicResponse {
    valid: boolean;
    remaining: Nullable<number>;
}

// Both of these are provided sometimes, other times it sends us a pretty error page.
// If the token is indeed valid, the remaining time would be in the 700s or 800s
const INVALID_TIMES = ["0", "300", "100000"];
const rlHandler = defineRateLimit({ interval: 10, allowed_per_interval: 3 });
export default defineEventHandler<Promise<Response>>(async (event) => {
    const token = getAuthToken(event);
    if (token === null) return setErrorResponseEvent(event, 400, STATIC_STRINGS.INVALID_TOKEN);

    const rl = rlHandler(event);
    if (rl !== null) return rl;
    const address = getRequestAddress(event);

    try {
        const response = await fetch("https://start.schulportal.hessen.de/ajax_login.php", {
            headers: {
                Cookie: `sid=${token}; ${getOptionalSchool(event)}`,
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/x-www-form-urlencoded",
                ...generateDefaultHeaders(address)
            },
            body: `name=${token}`,
            redirect: "manual",
            method: "POST"
        });

        const text = await response.text();

        const valid = text.length > 0 && text.length < 5 && !INVALID_TIMES.includes(text);
        const remaining = valid ? parseInt(text) : null;

        return { error: false, valid, remaining };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
