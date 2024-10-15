import { defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { generateDefaultHeaders, parseCookies, patterns, removeBreaks, setErrorResponseEvent, STATIC_STRINGS } from "../utils";
import { SchemaEntry, SchemaEntryConsumer, validateBodyNew } from "../validator";
import { ResetPasswordUserType } from "~/common/reset-password";
const bodySchema: SchemaEntryConsumer = {
    username: { type: "string", required: true, max: 32, pattern: patterns.USERNAME },
    type: { type: "string", required: true, validator_function: validateUserType },
    birthday: { type: "string", required: true, pattern: patterns.BIRTHDAY },
    school: { type: "number", required: true, max: 206568, min: 1 }
};

const userTypeConversions: Record<ResetPasswordUserType, string> = {
    student: "Schueler",
    parent: "Eltern",
    teacher: "Lehrer"
};
function validateUserType(_: string, __: SchemaEntry, value: string) {
    return !Object.keys(userTypeConversions).includes(value);
}

const rlHandler = defineRateLimit({ interval: 60, allowed_per_interval: 2 });
export default defineEventHandler(async (event) => {
    if (getRequestHeader(event, "Content-Type") !== STATIC_STRINGS.MIME_JSON)
        return setErrorResponseEvent(event, 400, STATIC_STRINGS.CONTENT_TYPE_NO_JSON);

    const body = await readBody<{ username: string; type: ResetPasswordUserType; birthday: string; school: number }>(event);
    const bodyValidation = validateBodyNew(bodySchema, body);
    if (bodyValidation.violations > 0 || bodyValidation.invalid) return setErrorResponseEvent(event, 400, bodyValidation);

    const rl = rlHandler(event);
    if (rl !== null) return rl;
    const address = getRequestAddress(event) as string;

    const { username, type, birthday, school } = body;

    try {
        // We need to fetch this for obtaining that ikey (whatever that is)
        const firstStep = await fetch("https://start.schulportal.hessen.de/benutzerverwaltung.php?a=userPWreminder&i=" + school, {
            method: "GET",
            redirect: "manual",
            headers: generateDefaultHeaders(address)
        });

        const { sid } = parseCookies(firstStep.headers.getSetCookie());
        if (!sid) return setErrorResponseEvent(event, 503);

        const html = removeBreaks(await firstStep.text());
        const firstIkey = readIkey(html);

        if (firstIkey === null) throw new Error("Expected ikey from Schulportal");

        const requestForm = [
            "b=step2",
            `ikey=${firstIkey}`,
            `login=${encodeURIComponent(username)}`,
            `check=${encodeURIComponent(birthday)}`,
            `type=${userTypeConversions[type]}`
        ].join("&");

        const secondStep = await fetch("https://start.schulportal.hessen.de/benutzerverwaltung.php?a=userPWreminder", {
            method: "POST",
            headers: {
                Cookie: `sid=${sid}`,
                "Content-Type": "application/x-www-form-urlencoded",
                ...generateDefaultHeaders(address)
            },
            body: requestForm
        });

        const secondHTML = removeBreaks(await secondStep.text());
        if (!/<input id="token2"/i.test(secondHTML)) throw new Error("Expected token in response HTML from Schulportal");

        const token = secondHTML.match(/(?:<input type="hidden" name="token1" value=")([a-f0-9]{64})(?:"( \/)?>)/i)![1];
        const secondIkey = readIkey(secondHTML);

        return { error: false, token, ikey: secondIkey, sid };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});

function readIkey(html: string): string | null {
    const ikeyMatch = html.match(/(?:<input type="hidden" name="ikey" value=")([a-f0-9]{32})(?:"( \/)?>)/i);
    if (ikeyMatch === null) return null;
    const ikey = ikeyMatch[1];
    if (!ikey || ikey.length !== 32 || /[^0-9a-f]/gi.test(ikey)) return null;

    return ikey;
}
