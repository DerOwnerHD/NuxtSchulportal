import { setErrorResponseEvent, BasicResponse, generateDefaultHeaders, getOptionalSchool } from "../utils";
import { defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { SchemaEntry, SchemaEntryConsumer, validateQueryNew } from "../validator";

interface Response extends BasicResponse {
    link: string;
}

const querySchema: SchemaEntryConsumer = {
    link: { required: true, type: "string", max: 512, validator_function: validateURL }
};

const rlHandler = defineRateLimit({ interval: 10, allowed_per_interval: 3 });
export default defineEventHandler<Promise<Response>>(async (event) => {
    const query = getQuery<{ link: string }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponseEvent(event, 400, queryValidation);

    const school = getOptionalSchool(event, null, false) as number;

    const rl = rlHandler(event);
    if (rl !== null) return rl;
    const address = getRequestAddress(event);

    try {
        const encodedURL = Buffer.from(query.link).toString("base64url");
        const loginURL = new URL("https://login.schulportal.hessen.de/");
        if (school) loginURL.searchParams.append("i", school.toString(10));
        loginURL.searchParams.append("url", encodedURL);
        const encodedLogin = Buffer.from(loginURL.toString()).toString("base64url");
        const response = await fetch(`https://llngproxy01.schulportal.hessen.de/?url=${encodedURL}`, {
            method: "GET",
            redirect: "manual",
            headers: generateDefaultHeaders(address)
        });
        const locationHeader = response.headers.get("Location");
        if (response.status !== 302 || locationHeader === null) return setErrorResponseEvent(event, 503, "Failed to generate SSO token");

        return { error: false, link: locationHeader };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});

/**
 * A validator function for the link GET parameter. Validates that the url specified is
 * a webpage under hessen.de. SPH does not validate URLs, allowing redirects to everywhere
 * (possibly creating phising attacks)
 */
function validateURL(key: string, schema: SchemaEntry, value: any) {
    if (typeof value !== "string") return true;
    try {
        const url = new URL(value);
        // We also want to prevent usage of any ports
        const isInvalidHost = !url.host.endsWith(".hessen.de");
        const hasDisallowedProtocol = !["https:", "http:"].includes(url.protocol);
        const hasCredentialsSet = !!(url.password || url.username);
        if (isInvalidHost || hasDisallowedProtocol || hasCredentialsSet) return true;
    } catch {
        return true;
    }
    return false;
}
