export async function useAESKey() {
    if (process.server) throw new Error("Cannot call useAESKey on the server");
    let key = localStorage.getItem("aes-key");
    // If we do try to initialize this twice, it may or may not
    // work, depending on whether this SPH-Session (and sid) cookie
    // already has a key linked to it. (SPH internals are unknown to us)
    if (key !== null) return key;
    const token = useToken();
    const session = useSession();
    if (!token.value || !session.value) throw new ReferenceError("Expected token and session to be set to generate AES key");
    console.log("Generating unique AES key for session");
    const { data, error } = await useFetch<{ key: string }>("/api/decryption", {
        query: {
            token: token.value,
            session: session.value
        },
        // These requests do have a pretty big rate limit, thus there
        // is no real point in retrying this, just show the user it failed
        retry: false
    });
    if (error.value !== null) {
        useAppErrors().value.aes = error.value.data?.error_details || error.value.cause;
        return null;
    }
    // We can safely assume that IF there ain't no error, there must be a key
    key = data.value?.key as string;
    // Still, something maaaay (very big may) have gone wrong
    if (!patterns.AES_PASSWORD.test(key)) throw new Error("AES key has incorrect format");
    localStorage.setItem("aes-key", key);
    return key;
}
