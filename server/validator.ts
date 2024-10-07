const NUMBER_BOOLEAN_PATTERN = /^(0|1)$/;
const JSON_BOOLEAN_PATTERN = /^(true|false)$/;

/**
 * Validates a request GET query and its parameters. Only the types **string**, **number**
 * and **boolean** are supported for validation. Note that in a query, all these are stringified
 * and depending on the schema requirement, are parsed into the correct type.
 *
 * If a part of the query is invalid, it returns those violations seperatly for every entry in the schema.
 *
 * The count of violations can be easily checked. The body passed might also be invalid,
 * a flag indicates that. The response is designed for the frontend to have a better understanding
 * of what actually went wrong.
 * @param schema The SchemaEntryConsumer compliant data used to validate the request body
 * @param query The query, read using getQuery(H3Event)
 * @returns The computed violations
 */
export function validateQueryNew(schema: SchemaEntryConsumer, query: { [key: string]: string | string[] }) {
    const offenseList = [];
    for (const entry of Object.keys(schema)) {
        const offenses: SchemaOffense[] = [];
        const schemaItem = schema[entry];

        // We assume that Nuxt handles our validation for us and that we can always assume that if
        // Nuxt passes us an array, there are at least two entries, might they be empty or not
        const hasMultiple = Array.isArray(query[entry]);
        const queryItem = (!hasMultiple ? query[entry] : query[entry][0]) as string;

        // In a query, if it exists, we would always get a string
        // Empty strings can safely be disregarded. If that should ever
        // change, update this.
        const existsInQuery = queryItem !== undefined && queryItem !== "";

        if (!existsInQuery && schemaItem.required) {
            offenses.push("required_missing");
            offenseList.push({ offenses, entry, schema: serializeSchemaEntry(schemaItem) });
            continue;
        }

        const functionResult = schemaItem.validator_function ? schemaItem.validator_function(entry, schemaItem, queryItem) : false;
        if (functionResult) offenses.push("validator_function_failed");

        const isNumberDesired = schemaItem.type === "number";
        const isBooleanDesired = schemaItem.type === "boolean";

        const parsedAsType = isNumberDesired
            ? parseFloat(queryItem)
            : isBooleanDesired
              ? NUMBER_BOOLEAN_PATTERN.test(queryItem)
                  ? !!parseInt(queryItem)
                  : JSON_BOOLEAN_PATTERN.test(queryItem)
                    ? (JSON.parse(queryItem) as boolean)
                    : null
              : queryItem;

        if (parsedAsType === null && existsInQuery) {
            offenses.push("incorrect_type");
            offenseList.push({ offenses, entry, schema: serializeSchemaEntry(schemaItem) });
            continue;
        }

        if (isNumberDesired && typeof parsedAsType === "number") {
            if (isInvalidNumber(parsedAsType)) {
                offenses.push("incorrect_type");
                offenseList.push({ offenses, entry, schema: serializeSchemaEntry(schemaItem) });
                continue;
            }

            if (schemaItem.min && parsedAsType < schemaItem.min) offenses.push("too_small");
            if (schemaItem.max && parsedAsType > schemaItem.max) offenses.push("too_large");
            if (schemaItem.size && parsedAsType !== schemaItem.size) offenses.push("unfit_size");
        }

        // The schema might not explicitly provide the type as string, as we default to that
        // So we still want to run these calculations on the data
        if (!isBooleanDesired && !isNumberDesired && existsInQuery) {
            // Here we can safely use queryItem, as it would be the same as parsedAsType
            // + we safe an unnecessary typeof check to make TS happy
            if (schemaItem.min && queryItem.length < schemaItem.min) offenses.push("too_small");
            if (schemaItem.max && queryItem.length > schemaItem.max) offenses.push("too_large");
            if (schemaItem.size && queryItem.length !== schemaItem.size) offenses.push("unfit_size");

            if (schemaItem.pattern && !schemaItem.pattern.test(queryItem)) offenses.push("pattern_no_match");
        }

        if (offenses.length) offenseList.push({ offenses, entry, schema: serializeSchemaEntry(schemaItem) });
    }
    const violationCount = offenseList.reduce((count, value) => (count += value.offenses.length), 0);
    return { entries: offenseList, violations: violationCount };
}

/**
 * Validates a request body of the type application/json. Only supports an object as the
 * base and the parameter types **string**, **number** and **boolean**. If a part of the
 * body is invalid, it returns those violations seperatly for every entry in the schema.
 *
 * The count of violations can be easily checked. The body passed might also be invalid,
 * a flag indicates that. The response is designed for the frontend to have a better understanding
 * of what actually went wrong.
 * @param schema The SchemaEntryConsumer compliant data used to validate the request body
 * @param body The body data, as read using the global function readBody(H3Event)
 * @returns The computed violations
 */
export function validateBodyNew(schema: SchemaEntryConsumer, body: { [key: string]: any }) {
    // This is crucial as the user might pass the Content-Type header but no corresponding body
    if (!body) return { violations: 0, invalid: true };
    // An array or i.e. a boolean or number also count as a valid body under application/json
    if (typeof body !== "object" || Array.isArray(body)) return { violations: 0, invalid: true };
    const offenseList = [];
    for (const entry of Object.keys(schema)) {
        const offenses: SchemaOffense[] = [];
        const schemaItem = schema[entry];
        const bodyItem = body[entry];

        // As a query has everything defaulting to a string, this is not a problem there
        if (!schemaItem.type) console.warn("A body schema requires a type to be set");

        // Here, we also have to take a null into account.
        // We would also not want to parse that
        const existsInBody = bodyItem != undefined;
        if (!existsInBody && schemaItem.required) {
            offenses.push("required_missing");
            offenseList.push({ offenses, entry, schema: serializeSchemaEntry(schemaItem) });
            continue;
        }

        if (typeof bodyItem !== schemaItem.type && existsInBody) {
            offenses.push("incorrect_type");
            offenseList.push({ offenses, entry, schema: serializeSchemaEntry(schemaItem) });
            continue;
        }

        const functionResult = schemaItem.validator_function ? schemaItem.validator_function(entry, schemaItem, bodyItem) : false;
        if (functionResult) offenses.push("validator_function_failed");

        // No boolean check needed here, as this SHOULD ;-) always be correct in JSON data
        const isNumberDesired = schemaItem.type === "number";
        const isStringDesired = schemaItem.type === "string";

        // After this point, we can safely assume that bodyItem has the desired type
        if (isNumberDesired && existsInBody) {
            if (isInvalidNumber(bodyItem)) {
                offenses.push("incorrect_type");
                offenseList.push({ offenses, entry, schema: serializeSchemaEntry(schemaItem) });
                continue;
            }

            if (schemaItem.min && bodyItem < schemaItem.min) offenses.push("too_small");
            if (schemaItem.max && bodyItem > schemaItem.max) offenses.push("too_large");
            if (schemaItem.size && bodyItem !== schemaItem.size) offenses.push("unfit_size");
        }

        if (isStringDesired && existsInBody) {
            // We do not wish to have empty strings
            if (!bodyItem.length) offenses.push("too_small");
            if (schemaItem.min && bodyItem.length < schemaItem.min) offenses.push("too_small");
            if (schemaItem.max && bodyItem.length > schemaItem.max) offenses.push("too_large");
            if (schemaItem.size && bodyItem.length !== schemaItem.size) offenses.push("unfit_size");

            if (schemaItem.pattern && !schemaItem.pattern.test(bodyItem)) offenses.push("pattern_no_match");
        }

        if (offenses.length) offenseList.push({ offenses, entry, schema: serializeSchemaEntry(schemaItem) });
    }
    const violationCount = offenseList.reduce((count, value) => (count += value.offenses.length), 0);
    return { entries: offenseList, violations: violationCount, invalid: false };
}

type SchemaOffense =
    | "required_missing"
    | "too_small"
    | "too_large"
    | "unfit_size"
    | "incorrect_type"
    | "pattern_no_match"
    | "validator_function_failed";

function isInvalidNumber(number: number) {
    return Number.isNaN(number) || !Number.isFinite(number) || !Number.isSafeInteger(number);
}

export interface SchemaEntryConsumer {
    [key: string]: SchemaEntry;
}

export interface SchemaEntry {
    required?: boolean;
    /**
     * If the recieved data is a query and not a body, the validator will attempt to parse it from it's stringified version
     * into the required type (coerce it into a boolean using either JSON.parse or !!parseInt when it's either 1 or 0).
     *
     * When defining a JSON body schema, the type should always be set as it cannot be inferred or defaulted as easily
     * (the query stringifies all values, a application/json body does not)
     */
    type?: "string" | "number" | "boolean";
    /**
     * This field can also be used to only allow specific options to be passed.
     * Should only be used when type is string
     * (if only specific numbers are needed, set type to string and set a regex like /1|5|8/)
     *
     * -> using a pattern like /student|teacher/
     */
    pattern?: RegExp;
    /**
     * Minimum value used for either a string length or a number
     *
     * -> query first parses the number, does not care about string length if type = number
     */
    min?: number;
    /**
     * Maximum value used for either a string length or a number
     *
     * -> query first parses the number, does not care about string length if type = number
     */
    max?: number;
    /**
     * Specifies the exact number or string length required
     */
    size?: number;
    /**
     * A function to run custom, not by default supported validations. Return a boolean with true meaning a
     * violation occured inside the function.
     *
     * This function is run after type and definition checks are validated. If these fail, no validations after
     * will be run.
     * @param key The schema/query/body name of the entry
     * @param schema The schema of the entry
     * @param value The value passed by the user (may also be undefined if not required)
     */
    validator_function?: (key: string, schema: SchemaEntry, value: any) => boolean;
}

interface SerializedSchemaEntry {
    required?: boolean;
    type?: "string" | "number" | "boolean";
    pattern?: string;
    min?: number;
    max?: number;
    size?: number;
    has_validator_function: boolean;
}

function serializeSchemaEntry(entry: SchemaEntry): SerializedSchemaEntry {
    // Only overwrites the pattern property of entry, takes everything else as is
    return Object.assign({}, entry, { pattern: entry.pattern?.toString(), has_validator_function: !!entry.validator_function });
}
