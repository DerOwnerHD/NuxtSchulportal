import { hasInvalidAuthentication, hasInvalidSidRedirect, hasPasswordResetLocationSet } from "~/server/failsafe";
import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { generateDefaultHeaders, patterns, getOptionalSchool, setErrorResponseEvent } from "../utils";

import cryptoJS from "crypto-js";
import { SchemaEntryConsumer, validateQueryNew } from "../validator";

const querySchema: SchemaEntryConsumer = {
    token: { required: true, pattern: patterns.SID },
    key: { required: true, pattern: patterns.AES_PASSWORD },
    id: { required: true, type: "number" }
};

const rlHandler = defineRateLimit({ interval: 15, allowed_per_interval: 4 });
export default defineEventHandler(async (event) => {
    const query = getQuery<{ key: string; id: string; token: string }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponseEvent(event, 400, queryValidation);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);
    const address = getRequestAddress(event);

    const { key, id, token } = query;

    try {
        const encodedId = encodeURIComponent(cryptoJS.AES.encrypt(id, key).toString());
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
            body: `a=read&uniqid=${encodedId}`
        });

        if (hasInvalidSidRedirect(response)) return setErrorResponseEvent(event, 403, "Route gesperrt");
        if (hasInvalidAuthentication(response)) return setErrorResponseEvent(event, 401);
        if (hasPasswordResetLocationSet(response)) return setErrorResponseEvent(event, 418, "Lege dein Passwort fest");

        const data = await response.json();
        if (data.error !== "0") return setErrorResponseEvent(event, 400, "AES key not yet set");

        const decodedMessage = Buffer.from(cryptoJS.AES.decrypt(data.message, key).toString(), "hex").toString();
        const message = JSON.parse(decodedMessage) as RawMessage;
        return { error: false, ...transformRawMessage(message) };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});

type JaNein = "ja" | "nein";
interface RawMessage {
    Id: string;
    Uniquid: string;
    Sender: string;
    SenderArt: string;
    groupOnly: JaNein;
    privateAnswerOnly: JaNein;
    noAnswerAllowed: JaNein;
    Betreff: string;
    Datum: string;
    Inhalt: string;
    WeitereEmpfaenger: string;
    SenderName: string;
    Papierkorb: JaNein;
    statistik: {
        teilnehmer: number;
        betreuer: number;
        eltern: number;
    };
    own: boolean;
    username: string;
    noanswer: boolean;
    Delete: string;
    reply: [];
    empf: string;
    private: number;
    ungelesen: boolean;
    AntwortAufAusgeblendeteNachricht: boolean;
}
interface Message {
    id: number;
    uuid: string;
    sender: {
        id: number;
        name: string;
        type: string;
    };
    reply: {
        groupOnly: boolean;
        privateAnswerOnly: boolean;
        noReplyAllowed: boolean;
        hiddenMessageReplyable: boolean;
    };
    title: string;
    content: string;
    hidden: boolean;
    own: boolean;
    dates: {
        sent: string;
        delete: string;
    };
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
            type: message.SenderArt
        },
        title: message.Betreff,
        hidden: message.Papierkorb === "ja",
        reply: {
            groupOnly: message.groupOnly === "ja",
            privateAnswerOnly: message.privateAnswerOnly === "ja",
            noReplyAllowed: message.noAnswerAllowed === "ja",
            hiddenMessageReplyable: message.AntwortAufAusgeblendeteNachricht
        },
        content: message.Inhalt,
        own: message.own,
        dates: {
            sent: message.Datum,
            delete: message.Delete
        },
        read: !message.ungelesen
    };
}
