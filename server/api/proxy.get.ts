import { getRequestAddress } from "~/server/ratelimit";
import { generateDefaultHeaders, patterns, getOptionalSchool, setErrorResponseEvent } from "../utils";
import { SchemaEntryConsumer, validateQueryNew } from "../validator";

const querySchema: SchemaEntryConsumer = {
    token: { required: true, pattern: patterns.SID },
    path: { required: true, min: 1, max: 100, pattern: /^pimg-l-[0-9]{1,7}_[0-9a-f]{32}-(xs|s|m|l|xl)\.png$/ }
};

export default defineEventHandler(async (event) => {
    const query = getQuery<{ token: string; path: string }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponseEvent(event, 400, queryValidation);

    const address = getRequestAddress(event);

    const { token, path } = query;

    try {
        const response = await fetch(`https://start.schulportal.hessen.de/${path}`, {
            method: "GET",
            headers: {
                Cookie: `sid=${token}; ${getOptionalSchool(event)}`,
                ...generateDefaultHeaders(address)
            }
        });

        event.node.res.setHeader("Content-Type", response.headers.get("Content-Type") ?? "image/png");
        return await response.blob();
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
