const KEYGEN_ERROR = "Entschlüsselung nicht möglich";
export async function useAESKey() {
    if (import.meta.server) throw new Error("Cannot call useAESKey on the server");
    let storage = localStorage.getItem("aes-key");
    // If we do try to initialize this twice, it may or may not
    // work, depending on whether this SPH-Session (and sid) cookie
    // already has a key linked to it. (SPH internals are unknown to us)
    const token = useToken();
    if (storage !== null) {
        try {
            const data = JSON.parse(storage);
            if (data.token === token.value) return data.key;
        } catch {
            console.error("Decryption key in storage is invalid, regenerating");
        }
    }
    if (!token.value) return void createAppError(AppID.AES, KEYGEN_ERROR, useAESKey);
    console.log("Generating unique AES key for session");
    try {
        const response = await $fetch("/api/decryption", {
            query: { token: token.value }
        });
        // This ought to never happen! If so, the server must be craaazy!
        if (!patterns.AES_PASSWORD.test(response.key)) throw new Error(KEYGEN_ERROR);
        localStorage.setItem("aes-key", JSON.stringify({ key: response.key, token: token.value }));
        return response.key;
    } catch (error) {
        void useReauthenticate(error);
        void createAppError(AppID.AES, KEYGEN_ERROR, useAESKey);
        console.log("Could not generate decryption key");
    }
}

/**
 * Checks whether there is an AES key stored in Local Storage and if it has been generated from the current token.
 * This does not mean it actually works. SPH internals are not known, who knows to what stuff this key is linked.
 * We'll just have to assume it still works.
 * @returns Whether the AES key set in the local storage is connected to the current token
 */
export function hasValidAESKeySet() {
    try {
        const storage = localStorage.getItem("aes-key");
        if (storage === null) return false;
        const data = JSON.parse(storage);
        return data.key && data.token === useToken().value;
    } catch {
        return false;
    }
}

/**
 * This method has been ripped from the SPH frontend (https://start.schulportal.hessen.de/js/createAEStoken.js).
 * The default implementation using Math.random is insecure.
 *
 * See the [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) for more details.
 * @returns The random UUID
 */
export function useRandomUUID() {
    if ("randomUUID" in crypto) return crypto.randomUUID();
    console.warn("Using insecure UUID generation");
    let time = performance.now();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx-xxxxxx3xx".replace(/[xy]/g, (char) => {
        const random = (time + Math.random() * 16) % 16 | 0;
        time = Math.floor(time / 16);
        return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
    });
}
