import { RateLimitAcceptance, handleRateLimit } from "../../ratelimit";
import { generateDefaultHeaders, parseCookie, patterns, setErrorResponse, validateBody } from "../../utils";

const schema = {
    body: {
        action: { type: "string", required: true, options: ["done", "undone"] },
        id: { type: "number", required: true, min: 1, max: 100000 },
        lesson: { type: "number", required: true, min: 1, max: 1000 }
    }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    if (req.headers["content-type"] !== "application/json") return setErrorResponse(res, 400, "Expected 'application/json' as 'content-type' header");

    const body = await readBody<{ action: "done" | "undone"; id: number; lesson: number }>(event);
    if (!validateBody(body, schema.body)) return setErrorResponse(res, 400, schema);

    if (!req.headers.authorization) return setErrorResponse(res, 400, "'authorization' header missing");
    if (!patterns.SID.test(req.headers.authorization)) return setErrorResponse(res, 400, "'authorization' header invalid");

    const rateLimit = handleRateLimit("/api/mylessons/homework.post", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { action, id, lesson } = body;

    try {
        const response = await fetch("https://start.schulportal.hessen.de/meinunterricht.php", {
            headers: {
                Cookie: `sid=${req.headers.authorization}`,
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest",
                ...generateDefaultHeaders(address)
            },
            body: `a=sus_homeworkDone&id=${id}&entry=${lesson}&b=${action}`,
            redirect: "manual",
            method: "POST"
        });

        const { i } = parseCookie(response.headers.get("set-cookie") || "");
        // The cookie might either be nonexistent or set to 0 if the user isn't logged in
        if (typeof i === "undefined" || i == "0") return setErrorResponse(res, 401);

        const text = await response.text();
        // This is the restrictor that occurs when the class is hidden for the user
        if (text.includes("Dieses Heft kann für diesen Account nicht geöffnet werden!"))
            return setErrorResponse(res, 403, "Class not available for user");
        // There is no other way to check - so if the request
        // ACTUALLY succeeded we have no real way of knowing
        // For example: If the lesson doesn't even exist or has
        // no homework set to it, is already done or undone, the
        // response does not tell us that.
        return { error: text !== "1" };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
