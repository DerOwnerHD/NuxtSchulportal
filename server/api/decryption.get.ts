import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import { generateDefaultHeaders, patterns, setErrorResponse, transformEndpointSchema, validateQuery } from "../utils";

import cryptoJS from "crypto-js";
import { constants, publicEncrypt } from "crypto";

const schema = {
    query: {
        token: { required: true, pattern: patterns.SID },
        session: { required: true, pattern: patterns.SESSION_OR_AUTOLOGIN }
    }
};

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

    const query = getQuery<{ token: string; session: string }>(event);
    const valid = validateQuery(query, schema.query);
    if (!valid) return setErrorResponse(res, 400, transformEndpointSchema(schema));

    const rateLimit = handleRateLimit("/api/decryption.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { token, session } = query;

    try {
        // This is a random string (UUID) encrypted using a random key
        // using symetric encryption (AES)
        const password = cryptoJS.AES.encrypt(generateUUID(), generateUUID());
        // Our encrypted password is then RSA encrypted using the public
        // key provided by SPH to be then sent to them in a handshake
        const encrypted = publicEncrypt(
            {
                key: PUBLIC_KEY,
                padding: constants.RSA_PKCS1_PADDING
            },
            Buffer.from(password.toString())
        );

        // In this handshake, the SPH decodes our with RSA encrypted key using
        // their private key and doing some shenanaigans backdoors where we don't
        // know what is happening. However a salt is added, see the "s" parameter,
        // just a random number somewhere in the hundreds or few thousands.
        const response = await fetch(`https://start.schulportal.hessen.de/ajax.php?f=rsaHandshake&s=${Math.floor(Math.random() * 2000)}`, {
            method: "POST",
            body: `key=${encodeURIComponent(encrypted.toString("base64"))}`,
            headers: {
                Cookie: `sid=${token}; SPH-Session=${session}`,
                "Content-Type": "application/x-www-form-urlencoded",
                ...generateDefaultHeaders(address)
            }
        });

        const json = await response.json();
        if (!json.challenge) return setErrorResponse(res, 500);

        // The SPH returns a challenge encrypted using our AES
        // encrypted password, which we sent encrypted using RSA
        // to the server (where is was decoded). We can then decode
        // that using our aforementioned password and obtain the
        // key we need to decode encrypted data SPH sends us
        const decrypted = cryptoJS.AES.decrypt(json.challenge, password.toString());
        const decryptedB64 = Buffer.from(decrypted.toString(), "hex").toString();

        // As the recieved data SHOULD just be the password we once
        // sent in encrypted using RSA, if the two things are diffrent
        // there has to be something wrong with it all
        if (decryptedB64 !== password.toString()) return setErrorResponse(res, 401, "Keys do not match");

        // No need to encode it, the client does that automatically when
        // using the useFetch composable and the query property there
        return { error: false, key: decryptedB64 };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
