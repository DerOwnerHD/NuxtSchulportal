import { hasInvalidAuthentication, hasInvalidSidRedirect, hasPasswordResetLocationSet } from "~/server/failsafe";
import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { generateDefaultHeaders, patterns, getOptionalSchool, setErrorResponseEvent } from "../utils";

import cryptoJS from "crypto-js";
import { SchemaEntryConsumer, validateQueryNew } from "../validator";

const querySchema: SchemaEntryConsumer = {
    token: { required: true, pattern: patterns.SID },
    key: { required: true, pattern: patterns.AES_PASSWORD },
    type: { required: true, pattern: /^(all|visible|invisible)$/ }
};

// yes, they called it unvisibleOnly, not invisible (wtf)
const typeTransforms = { all: "All", visible: "visibleOnly", invisible: "unvisibleOnly" };

const rlHandler = defineRateLimit({ interval: 15, allowed_per_interval: 2 });
export default defineEventHandler(async (event) => {
    const query = getQuery<{ key: string; type: "visible" | "invisible"; token: string }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponseEvent(event, 400, queryValidation);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);
    const address = getRequestAddress(event);

    const { key, type, token } = query;

    try {
        const response = await fetch("https://start.schulportal.hessen.de/nachrichten.php", {
            method: "POST",
            redirect: "manual",
            headers: {
                ...generateDefaultHeaders(address),
                Cookie: `sid=${token}; ${getOptionalSchool(event)}`,
                "Content-Type": "application/x-www-form-urlencoded",
                // if we do not provide this header, the SPH will kill our token quite literally
                // (making it impossible to use for ANY other requests after this)
                "X-Requested-With": "XMLHttpRequest"
            },
            body: `a=headers&getType=${typeTransforms[type] || "All"}&last=0`
        });

        if (hasInvalidSidRedirect(response)) return setErrorResponseEvent(event, 403, "Route gesperrt");
        if (hasInvalidAuthentication(response)) return setErrorResponseEvent(event, 401);
        if (hasPasswordResetLocationSet(response)) return setErrorResponseEvent(event, 418, "Lege dein Passwort fest");

        const data = await response.json();
        // If there was no AES key previously stored, we would expect this to just be set to false
        if (typeof data.rows !== "string") return setErrorResponseEvent(event, 400, "AES key not yet set");

        const stringifiedRows = cryptoJS.AES.decrypt(data.rows, key).toString(cryptoJS.enc.Utf8);
        const rows = JSON.parse(stringifiedRows) as RawMessage[];
        return { error: false, messages: rows.map((message) => transformRawMessage(message)) };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});

interface RawMessage {
    Id: string;
    Uniquid: string;
    Sender: string;
    Betreff: string;
    Papierkorb: "ja" | "nein";
    // It appears to be the count of people recieving the message
    private: number;
    WeitereEmpfaenger: string;
    empf: string[];
    SenderName: string;
    kuerzel: string;
    Datum: string;
    DatumUnix: number;
    unread: number;
}

interface Message {
    id: number;
    uuid: string;
    sender: {
        id: number;
        name: string;
        short: string;
    };
    title: string;
    hidden: boolean;
    recipients: string[];
    date: string;
    timestamp: number;
    read: boolean;
}

function transformRawMessage(message: RawMessage): Message {
    const removeHTMLTag = (text: string) => text.replace(/<[^>]*>/g, "").trim();
    return {
        id: parseInt(message.Id),
        uuid: message.Uniquid,
        sender: {
            id: parseInt(message.Sender),
            name: removeHTMLTag(message.SenderName),
            short: message.kuerzel
        },
        title: message.Betreff,
        hidden: message.Papierkorb === "ja",
        // Sometimes there are empty ones (WHYEVER), we do not want them to be included
        recipients: message.empf.map((recipient) => removeHTMLTag(recipient)).filter((recipient) => recipient !== ""),
        date: message.Datum,
        // SPH provides it in seconds, we want milliseconds
        timestamp: message.DatumUnix * 1000,
        read: !message.unread
    };
}
