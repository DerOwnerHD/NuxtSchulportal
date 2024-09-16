import { RateLimitAcceptance, handleRateLimit } from "../ratelimit";
import { BasicResponse, STATIC_STRINGS, authHeaderOrQuery, generateDefaultHeaders, setErrorResponse } from "../utils";

import cryptoJS from "crypto-js";
import { constants, publicEncrypt } from "crypto";
import { SPH_PUBLIC_KEY, generateUUID } from "../crypto";

interface Response extends BasicResponse {
    key: string;
}

export default defineEventHandler<Promise<Response>>(async (event) => {
    const { req, res } = event.node;
    const address = getRequestIP(event, { xForwardedFor: true });

    const token = authHeaderOrQuery(event);
    if (token === null) return setErrorResponse(res, 400, STATIC_STRINGS.INVALID_TOKEN);

    const rateLimit = handleRateLimit("/api/decryption.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    try {
        // This is a random string (UUID) encrypted using a random key
        // using symetric encryption (AES)
        // => we also just throw away the key, this is just so there is
        // a pseudo-random string we can use (always better)
        const password = cryptoJS.AES.encrypt(generateUUID(), generateUUID());
        // Our encrypted password is then RSA encrypted using the public
        // key provided by SPH to be then sent to them in a handshake
        const encrypted = publicEncrypt(
            {
                key: SPH_PUBLIC_KEY,
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
                Cookie: `sid=${token}`,
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
