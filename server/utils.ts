import { IncomingMessage, ServerResponse } from "http";

const DEFAULT_ERRORS: { [status: string]: string } = {
    "400": "Bad Request",
    "401": "Unauthorized",
    "403": "Forbidden",
    "404": "Not Found",
    "405": "Method Not Allowed",
    "410": "Gone",
    "429": "Too Many Requests",
    "500": "Internal Server Error",
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
    MOODLE_COOKIE: /^[a-z0-9]{26}$/
};

export const validateQuery = (
    query: any,
    schema: { [key: string]: { required: boolean; length?: number; type?: string; min?: number; max?: number; pattern?: RegExp } }
): boolean => {
    for (const key in schema) {
        if (!key.length) continue;
        const object = schema[key];
        const value = query[key];
        if (typeof value === "string" && object.pattern && !object.pattern.test(value)) return false;
        if (object.type === "number") {
            const valueAsNumber = parseFloat(value);
            if (!Number.isInteger(valueAsNumber)) return false;
            if ((object.max && valueAsNumber > object.max) || (object.min && valueAsNumber < object.min)) return false;
        }
        if ((value == undefined && object.required) || (object.length !== undefined && value.length !== object.length)) return false;
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
        };
    }
): boolean => {
    for (const key in schema) {
        if (!key.length) continue;
        const object = schema[key];
        const value = body[key];
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
