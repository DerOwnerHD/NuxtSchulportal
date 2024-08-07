import { generateDefaultHeaders, patterns, schoolFromRequest, setErrorResponse } from "../utils";
import { SchemaEntryConsumer, validateQueryNew } from "../validator";

const querySchema: SchemaEntryConsumer = {
    token: { required: true, pattern: patterns.SID },
    path: { required: true, min: 1, max: 100, pattern: /^pimg-l-[0-9]{1,7}_[0-9a-f]{32}-(xs|s|m|l|xl)\.png$/ }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const query = getQuery<{ token: string; path: string }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponse(res, 400, queryValidation);

    const { token, path } = query;

    try {
        const response = await fetch(`https://start.schulportal.hessen.de/${path}`, {
            method: "GET",
            headers: {
                Cookie: `sid=${token}; ${schoolFromRequest(event)}`,
                ...generateDefaultHeaders(address)
            }
        });

        res.setHeader("Content-Type", response.headers.get("Content-Type") || "image/png");
        return await response.blob();
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
