/**
 * This is the public key of the keypair used by the SPH to handle encrypted communication.
 * Most likely this is a remnant of when HTTPS was not widely enforced and thus they wanted
 * to be able to securely send some specific data like login credentials or attendance data
 * over an encrypted connection.
 */
export const SPH_PUBLIC_KEY =
    "-----BEGIN PUBLIC KEY-----\nMIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgGpTJwSxNDmELTK+qfZUowESiPD/\nrFaHQ7UyLEiLtleYGb6bvIFG+hAa25RY6ZP0a653QKfA5LFUs6IFQLU1JT9Uahtw\nHAAsb0oLWJukaa/6XGqRGTM3tKAWIQOxEqIxS8zBHdQZiZQZmuZlSrwdJwJLBoSr\nbp8iQWB1XMYlJigLAgMBAAE=\n-----END PUBLIC KEY-----";

/**
 * This method has been ripped from the SPH frontend (https://start.schulportal.hessen.de/js/createAEStoken.js).
 * The default implementation using Math.random is insecure. Thus, when available (which should always be the case)
 * the function uses crypto.randomUUID. This is implemented in Node since version 19. 
 * 
 * See the [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) for more details.
 * @returns The random UUID
 */
export function generateUUID() {
    if ("randomUUID" in crypto) return crypto.randomUUID();
    console.warn("Using unsecure UUID generation");
    let time = performance.now();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx-xxxxxx3xx".replace(/[xy]/g, (char) => {
        const random = (time + Math.random() * 16) % 16 | 0;
        time = Math.floor(time / 16);
        return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
    });
}