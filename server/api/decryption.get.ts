import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { BasicResponse, STATIC_STRINGS, getAuthToken, generateDefaultHeaders, setErrorResponseEvent } from "../utils";

import cryptoJS from "crypto-js";
import { constants, publicEncrypt } from "crypto";
import { SPH_PUBLIC_KEY, generateUUID } from "../crypto";

interface Response extends BasicResponse {
    key: string;
}

// This may get called often if you reauth in quick succession
const rlHandler = defineRateLimit({ interval: 60, allowed_per_interval: 4 });
export default defineEventHandler<Promise<Response>>(async (event) => {
    const token = getAuthToken(event);
    if (token === null) return setErrorResponseEvent(event, 400, STATIC_STRINGS.INVALID_TOKEN);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);
    const address = getRequestAddress(event);

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
        if (!json.challenge) return setErrorResponseEvent(event, 500);

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
        if (decryptedB64 !== password.toString()) return setErrorResponseEvent(event, 401, "Keys do not match");

        // No need to encode it, the client does that automatically when
        // using the useFetch composable and the query property there
        return { error: false, key: decryptedB64 };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
