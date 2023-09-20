import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import { generateDefaultHeaders, patterns, setErrorResponse } from "../utils";

import cryptoJs from "crypto-js";
import { constants, publicEncrypt } from "crypto";

// This is the public key avaliable under https://start.schulportal.hessen.de/ajax.php?f=rsaPublicKey
// It should (hopefully) not change any time soon
const PUBLIC_KEY =
    "-----BEGIN PUBLIC KEY-----\nMIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgGpTJwSxNDmELTK+qfZUowESiPD/\nrFaHQ7UyLEiLtleYGb6bvIFG+hAa25RY6ZP0a653QKfA5LFUs6IFQLU1JT9Uahtw\nHAAsb0oLWJukaa/6XGqRGTM3tKAWIQOxEqIxS8zBHdQZiZQZmuZlSrwdJwJLBoSr\nbp8iQWB1XMYlJigLAgMBAAE=\n-----END PUBLIC KEY-----";

// This method is directly implemented from the Schulportal
// For the original code see https://start.schulportal.hessen.de/js/createAEStoken.js
function generateUUID() {
    let time = performance.now();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx-xxxxxx3xx".replace(/[xy]/g, (char) => {
        const random = (time + Math.random() * 16) % 16 | 0;
        time = Math.floor(time / 16);
        return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
    });
}

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    if (!req.headers.authorization) return setErrorResponse(res, 400, "'authorization' header missing");
    if (!patterns.SID.test(req.headers.authorization)) return setErrorResponse(res, 400, "'authorization' header invalid");

    const rateLimit = handleRateLimit("/api/decryption.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    try {
        const password = cryptoJs.AES.encrypt(generateUUID(), generateUUID());
        const encrypted = publicEncrypt(
            {
                key: PUBLIC_KEY,
                padding: constants.RSA_PKCS1_PADDING
            },
            Buffer.from(password.toString(), "utf-8")
        );

        const response = await fetch(`https://start.schulportal.hessen.de/ajax.php?f=rsaHandshake&s=${Math.floor(Math.random() * 2000)}`, {
            method: "POST",
            body: `key=${encodeURIComponent(encrypted.toString("base64"))}`,
            headers: {
                Cookie: `sid=${req.headers.authorization}`,
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest",
                ...generateDefaultHeaders(address)
            }
        });

        return await response.json();
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
