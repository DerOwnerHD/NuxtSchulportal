import { H3Event } from "h3";
import { BasicResponse, setErrorResponseEvent } from "~/server/utils";

export enum RateLimitAcceptance {
    /**
     * Only sent if a requirement for the rate limit handler has not been met.
     *
     * Sent if an IP address is not set or multiple X-RateLimit-Bypass keys are set.
     *
     * The handler is expected to send a 403 code.
     */
    Forbidden,
    /**
     * A rate limit has been reached, return a 429 code.
     */
    Rejected,
    /**
     * Everything is fine, the request can proceed and has been added to the client rate limit map.
     */
    Allowed
}

interface RateLimitRouteConfig {
    /**
     * The interval in seconds after which one request is popped from the stack.
     *
     * This removal does not happen automatically, rather on the next check by that client on that route.
     */
    interval: number;
    /**
     * The max number of requests currently held in the client's stack after which a request is rejected.
     */
    allowed_per_interval: number;
    /**
     * Whether the route prevents the usage of the X-RateLimit-Bypass header
     */
    forbid_bypass?: boolean;
}

/**
 * This holds the timestamps of the requests the user has issued.
 *
 * The system always checks the first item and sees if the interval has passed since then.
 * If so, the item is popped from the array.
 */
type RateLimitClient = number[];

/**
 * Define a rate limit for a route.
 * @param config
 * @returns A handler function for any H3Event for that route
 */
export function defineRateLimit(config: RateLimitRouteConfig) {
    const rateLimitBypassKey = useRuntimeConfig().private.rateLimitBypass;
    const clients = new Map<string, RateLimitClient>();
    /**
     * Checks the rate limit for a client using this route.
     * Pass the event to receive a result
     * @param event The H3Event
     * @returns Whether the request should be allowed. See RateLimitAcceptance enum.
     */
    function handler(event: H3Event): BasicResponse | null {
        const bypassHeader = getRequestHeader(event, "X-RateLimit-Bypass");
        // Multiple entries are strictly disallowed
        if (bypassHeader?.includes(",")) return setRejectionStatus(event, RateLimitAcceptance.Forbidden);
        if (
            !config.forbid_bypass &&
            typeof bypassHeader === "string" &&
            typeof rateLimitBypassKey === "string" &&
            bypassHeader === rateLimitBypassKey
        )
            return null;

        const address = getRequestAddress(event);
        if (!address) return setRejectionStatus(event, RateLimitAcceptance.Forbidden);

        const now = Date.now();

        if (!clients.has(address)) {
            clients.set(address, [now]);
            return null;
        }

        const client = clients.get(address) as RateLimitClient;
        if (!client.length) {
            client[0] = now;
            return null;
        }

        const diffToEarliest = now - client[0];
        if (diffToEarliest > config.interval * 1000) client.splice(0, 1);

        if (client.length >= config.allowed_per_interval)
            return setRejectionStatus(event, RateLimitAcceptance.Rejected, config.interval * 1000 - diffToEarliest);

        client.push(now);
        return null;
    }
    return handler;
}

function setRejectionStatus(event: H3Event, acceptance: RateLimitAcceptance, nextRequestAfter?: number): BasicResponse | null {
    if (acceptance === RateLimitAcceptance.Allowed) return null;
    return setErrorResponseEvent(event, acceptance === RateLimitAcceptance.Forbidden ? 403 : 429, undefined, {
        next_request_after: nextRequestAfter
    });
}

/**
 * Attempts to load the user's IP address from the H3Event Nuxt passed to the event handler.
 * As Nuxt adds that address as an X-Forwarded-For header, this function attempts to read it from there.
 *
 * For rate limiting, the request is expected to fail if no address is given.
 *
 * CRITICAL: getRequestIP cannot be used, as the flag for using the xForwardedFor header has to be set.
 * That function then always picks the first header of that name.
 * As Nuxt only attaches its header last, this would result in the user being able to use their custom address
 * and thus bypass any rate limit.
 *
 * See https://github.com/unjs/h3/blob/main/src/utils/request.ts#L311 for this implementation
 * @param event The H3Event
 * @returns The address - or null if none is found
 */
export function getRequestAddress(event: H3Event) {
    // The user can pass multiple X-Forwarded-For headers however they like. Nuxt then attaches its own header at the very end.
    // We cannot trust user input but will always have to assume that Nuxt added one for us.
    const addressHeaderString = getRequestHeader(event, "X-Forwarded-For");
    if (typeof addressHeaderString !== "string") return null;

    // getRequestHeader provides a string with all headers of the same name split by ", "
    const addressHeaders = addressHeaderString.split(", ");
    const address = addressHeaders.at(-1);
    return address ?? null;
}
