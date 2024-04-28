import { IncomingMessage, ServerResponse } from "http";

const DEFAULT_ERRORS: { [status: string]: string } = {
    "400": "Bad Request",
    "401": "Unauthorized",
    "403": "Forbidden",
    "404": "Not Found",
    "405": "Method Not Allowed",
    "410": "Gone",
    "418": "I'm a teapot",
    "429": "Too Many Requests",
    "500": "Internal Server Error",
    "502": "Bad Gateway",
    "503": "Service Not Available"
};

export const setResponse = (res: ServerResponse<IncomingMessage>, status: number, response: any): any => {
    res.statusCode = status;
    return response;
};

export const setErrorResponse = (res: ServerResponse<IncomingMessage>, status: number, details?: string | object): any => {
    res.statusCode = status;
    if (details) return { error: true, error_details: details };

    return {
        error: true,
        error_details: `${status}: ${DEFAULT_ERRORS[status.toString()]}`
    };
};

export const patterns = {
    USERNAME: /^([A-Z]+\.[A-Z]+(?:-[A-Z]+)?|[A-Z]{3})$/i,
    BIRTHDAY: /^(([12][0-9]|0[1-9]|3[0-1])\.(0[1-9]|11|12)\.(?:19|20)\d{2})$/,
    PW_RESET_CODE: /^([a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4})$/i,
    HEX_CODE: /^[a-f0-9]+$/,
    MOODLE_SESSION: /^[a-z0-9]{10}$/i,
    MOODLE_COOKIE: /^[a-z0-9]{26}$/,
    SESSION_OR_AUTOLOGIN: /^[a-f0-9]{64}$/,
    EMBEDDED_TOKEN: /(?:<input type="hidden" name="token" value=")([a-f0-9]{64})(?:"(?: \/)?>)/i,
    SPH_LOGIN_KEY: /^https:\/\/start.schulportal.hessen.de\/schulportallogin.php?k=[a-f0-9]{96}$/,
    SID: /^[a-z0-9]{26}$/,
    NOTIFICATION_AUTH: /^[a-z0-9_-]{22}$/i,
    NOTIFICATION_P256DH: /^B[a-z0-9_-]+$/i,
    AES_PASSWORD: /^[A-Za-z0-9/\+=]{88}$/,
    DATE_YYYY_MM_DD_HYPHENS: /^20[12]\d\-(0[1-9]|1[0-2])\-(0[1-9]|[12]\d|3[01])$/,
    DATE_YYYY_MM_DD_HYPHENS_OR_YEAR: /^year|20[12]\d\-(0[1-9]|1[0-2])\-(0[1-9]|[12]\d|3[01])$/,
    SPH_DIRECT_MESSAGE_UUID: /^[0-9a-f]{32}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
};

// This is in use when the user has to reset their password on SPH
// All URLs get redirected to this URL and we need to make them aware of it
// The second part is needed by the Splan, as it has to follow redirects
export const hasPasswordResetLocationSet = (response: Response) =>
    (response.status === 302 && response.headers.get("location") === "benutzerverwaltung.php?a=userChangePassword") ||
    response.url === "https://start.schulportal.hessen.de/benutzerverwaltung.php?a=userChangePassword";

export const knownSubscriptionServices = [
    "android.googleapis.com",
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "updates-autopush.stage.mozaws.net",
    "updates-autopush.dev.mozaws.net",
    ".*\\.notify.windows.com",
    ".*\\.push.apple.com"
].map((service) => new RegExp(`^${service.replace("*", ".*")}$`, "i"));

export const isSubscriptionService = (host: string) => knownSubscriptionServices.some((pattern) => pattern.test(host));

export const validateQuery = (
    query: any,
    schema: {
        [key: string]: {
            required: boolean;
            length?: number;
            type?: string;
            min?: number;
            max?: number;
            pattern?: RegExp;
            options?: any[];
        };
    }
): boolean => {
    for (const key in schema) {
        if (!key.length) continue;

        const object = schema[key];
        const value = query[key];

        // If either the pattern is incorrect or the value is not in the
        // valid options, we don't allow the request to continue
        if (typeof value === "string" && ((object.pattern && !object.pattern.test(value)) || (object.options && !object.options.includes(value))))
            return false;

        if (object.type === "number" && value != undefined) {
            const valueAsNumber = parseFloat(value);
            if (!Number.isInteger(valueAsNumber) || !Number.isSafeInteger(valueAsNumber) || !Number.isFinite(valueAsNumber)) return false;
            if ((object.max && valueAsNumber > object.max) || (object.min && valueAsNumber < object.min)) return false;
        }

        // If we have a string and it is either too large or too small, we fail
        if (
            object.type === "string" &&
            value != undefined &&
            ((object.min && object.min > value.length) || (object.max && object.max < value.length))
        )
            return false;

        // As we always just recieve strings, we have
        // to make sure it is a boolean this way
        if (object.type === "boolean" && value != undefined && !["false", "true"].includes(value)) return false;

        if ((value == undefined && object.required) || (object.length !== undefined && value?.length !== object.length && value != undefined))
            return false;
    }

    return true;
};

/**
 * Validates the body has the required types of the things passed to it
 * @param body The object of the JSON body sent
 * @param schema The expected layout of the body
 * @returns Whether the body is valid
 * @example { username: "testtest123" } as body and { username: { type: "string", required: true } } as schema
 */
export const validateBody = (
    body: any,
    schema: {
        [key: string]: {
            type: string;
            required: boolean;
            min?: number;
            max?: number;
            size?: number;
            pattern?: RegExp;
            options?: any[];
        };
    }
): boolean => {
    // CRUCIAL: The user may just pass the header but no actual body
    if (!body) return false;
    const keys = Object.keys(body);
    const allowedKeys = Object.keys(schema);
    for (const key of keys) {
        if (!allowedKeys.includes(key)) return false;
    }
    for (const key in schema) {
        if (!key.length) continue;
        const object = schema[key];
        const value = body[key];
        if (value == undefined && object.required) return false;
        if (["number", "string"].includes(object.type) && value != undefined && typeof value === object.type) {
            if ((object.type === "number" && !Number.isInteger(value)) || (object.type === "string" && value === "")) return false;
            // Our accessor is either length for a string or just the value for a number
            const accessor = value.length ?? value;
            if (
                (object.min !== undefined && accessor < object.min) ||
                (object.max !== undefined && accessor > object.max) ||
                (object.size !== undefined && accessor !== object.size)
            )
                return false;

            if (typeof value === "string" && ((object.pattern && !object.pattern.test(value)) || (object.options && !object.options.includes(value))))
                return false;
        }

        // We explicitly only use == because the object may also be null
        if ((object.required && value == undefined) || (value != undefined && typeof value !== object.type)) return false;
    }

    return true;
};

/**
 * Parses the Cookie or set-cookie string from HTTP requests
 * and removes any Cookie Attributes like HttpOnly or SameSite
 * @param str The string recieved in HTTP requests
 * @returns a dictionary of the individual cookies
 */
export const parseCookie = (str: string) =>
    // All these attributes might or might not be capitalized, have some data
    // like "secure=1" set to it, so we need to parse all these things
    str
        .replace(/(expires|secure|httponly|samesite|domain|path)(=[^;]+)?[,;]?/gi, "")
        .split(";")
        .map((pair) => pair.split("="))
        .reduce((accumulated: { [key: string]: string }, pair) => {
            if (pair.length < 2) return accumulated;
            accumulated[decodeURIComponent(pair[0].trim())] = decodeURIComponent(pair[1].trim());
            return accumulated;
        }, {});

export const parseCookies = (strings: string[]) => parseCookie(strings.join("; "));

/**
 * Cleans a string from all empty spaces which may stop
 * a function from working with it correctly. This mostly
 * applies to Schulportal HTML requests. This includes a lot
 * of different RegEx patterns for empty strings
 * @param text String of which to remove empty spaces from
 * @returns Cleaned string
 */
export const removeBreaks = (text: string): string =>
    text
        .replace(/(\r\n|\n|\r)/gm, "<1br />")
        .replace(/<1br \/><1br \/><1br \/>/gi, "<1br /><2br />")
        .replace(/<1br \/><1br \/>/gi, "")
        .replace(/\<1br \/>/gi, " ")
        .replace(/\s+/g, " ")
        .replace(/<2br \/>/gi, "\n\n");

// This function can go fuck itself
export const parseJSONBody = (req: IncomingMessage): { [key: string]: string } => {
    try {
        const body = JSON.parse(req.read());
        // NOTE: Running JSON.parse on "true", "false", "null" or any number
        // returns that number just fine. So when parsing that body, we have to
        // expect it to actually be JSON and not some crap someone sent to
        // cause an error on the server. It is also unsafe to assume it's just
        // an object, due to null also being an object type. (Which is parsable)
        if (["number", "boolean"].includes(typeof body) || body === null || Array.isArray(body))
            throw new TypeError("Body musn't be a number, a boolean, an array or null");
        return body;
    } catch (error) {
        return {};
    }
};

export const generateForwardedHeader = (address?: string): [string, string] => {
    return ["X-Forwarded-For", address || "127.0.0.1"];
};

export const generateDefaultHeaders = (address?: string) => {
    return {
        "X-Forwarded-For": address || "127.0.0.1",
        "User-Agent": "NuxtSchulportal (https://github.com/DerOwnerHD/NuxtSchulportal)"
    };
};

/**
 * Checks whether the response has the "i" (institution) cookie is set to "0",
 * thus meaning the authentication provided by the user is not valid.
 * @param response The Fetch API response thats supposed to be parsed
 * @returns whether the request is sucessfully authed
 */
export const hasInvalidAuthentication = (response: Response) => parseCookies(response.headers.getSetCookie())["i"] === "0";

/**
 * Gets either the content of the Authorization header or the query key "token",
 * either one of these may contain the SPH token (sid cookie) needed for most requests.
 * @param event The H3Event given by Nuxt's event handler
 * @returns The cookie string or just null if it is not given or incorrect
 */
export const authHeaderOrQuery = (event: any): string | null => {
    const { token } = getQuery<{ token?: string }>(event);
    const {
        headers: { authorization }
    } = event.node.req as IncomingMessage;
    // Neither of them are given...
    if (typeof token !== "string" && typeof authorization !== "string") return null;
    // We can safely assume that one of them has to be correct
    if (!patterns.SID.test(token || authorization!)) return null;
    // Again, we can block this TS error as we know that one of them HAS to be a string
    return token || authorization!;
};

export const MIN_ALLOWED_SCHOOL = 1;
export const MAX_ALLOWED_SCHOOL = 9999;
/**
 * Loads the school ID from a request.
 *
 * This is not required by SPH by default but acts as a failsafe whenever they do not
 * want to use our sid to parse what we belong to (At least it seems like that).
 * If SPH does not wish to do that, they give us a 302 with an invalid sid inside Set-Cookie (FOR SOME REASON).
 *
 * **Only** when adding the school (i) cookie, this is (of current testing) prevented.
 *
 * Should this function return null, the request handler is expected to not send
 * such a cookie whats-o-ever.
 * If the request might then fail, there is another detection for that in place
 * (302 with location to "/" and Set-Cookie with sid => detection from that)
 * @param event The H3 event given by Nuxt
 * @param body An optional body sent by, i.e. POST requests
 * @param stringify Directly format it according to the needs of the Cookie header (i=school) or an completely empty string when null (Default is true)
 * @returns The school ID, if in request and valid
 */
export const schoolFromRequest = (event: any, body?: any, stringify: boolean = true) => {
    const { school } = getQuery<{ school: string }>(event);
    // The school might also in POST requests be included inside the body.
    // (/login has that but that does not use this routine)
    const schoolInBody = typeof body === "object" && body != null ? body.school : null;
    // The query takes priority, it is far less likely for a body to even exist
    const parsed = parseInt(school ?? schoolInBody);
    if (isNaN(parsed) || parsed > MAX_ALLOWED_SCHOOL || parsed < MIN_ALLOWED_SCHOOL) return stringify ? "" : null;
    return stringify ? `i=${parsed}` : parsed;
};

/**
 * Transforms the schema of an endpoint so it can be sent as
 * valid JSON, so this function replaces the RegEx patterns
 * with the stringified version of these patterns instead of
 * the object, which is in JSON just {}.
 * @param schema Schema of the endpoint (with query and/or body)
 * @returns the modified schema
 */
export const transformEndpointSchema = (schema: any) => {
    // We HAVE to create a copy of it or otherwise that reference would
    // also modify our normal schema passed to this function (which would be BAD)
    const transformedSchema = JSON.parse(JSON.stringify(schema));

    const structures = ["body", "query", "headers"];
    for (const structure of structures) {
        if (schema[structure] === undefined) continue;
        for (const key of Object.keys(schema[structure])) {
            const value = schema[structure][key];
            if (!value.pattern) continue;

            transformedSchema[structure][key].pattern = value.pattern.toString();
        }
    }

    return transformedSchema;
};

/**
 * A class used to catch errors that occurr when fetching data
 * from the Schulportal. It includes the choice to show that error
 * in the 500 API response back to the user.
 */
export class APIError extends Error {
    public showToUser: boolean;
    constructor(message: string, showToUser?: boolean) {
        super(message);
        this.showToUser = showToUser || false;
    }
}

export interface BasicResponse {
    error: boolean;
    error_details?: any;
}
