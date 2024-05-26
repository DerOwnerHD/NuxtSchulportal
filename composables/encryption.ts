const KEYGEN_ERROR = "Entschlüsselung nicht möglich";
export async function useAESKey() {
    if (process.server) throw new Error("Cannot call useAESKey on the server");
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
    if (!token.value) return useAppErrors().value.set("aes", KEYGEN_ERROR);
    console.log("Generating unique AES key for session");
    try {
        const response = await $fetch("/api/decryption", {
            query: { token: token.value }
        });
        if (!patterns.AES_PASSWORD.test(response.key)) throw new Error(KEYGEN_ERROR);
        localStorage.setItem("aes-key", JSON.stringify({ key: response.key, token: token.value }));
        return response.key;
    } catch (error) {
        useReauthenticate(error);
        useAppErrors().value.set("aes", error);
        console.log("Could not generate decryption key");
    }
}
