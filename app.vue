<template>
    <div>
        <button class="absolute bg-white z-10 top-0 opacity-0" onclick="location.reload()">Neu laden</button>
        <button class="absolute bg-white z-10 top-0 right-0 opacity-0" @click="useCredentials<any>().value = null">Neu laden</button>
        <div id="background" class="fixed">
            <div id="overlay" :style="getSchoolBG()"></div>
        </div>
        <header id="header" class="sticky w-screen h-16 rounded-b-xl drop-shadow-lg flex place-items-center place-content-center text-white">
            <span class="text-3xl">Schulportal</span>
            <span class="mt-[-0.75rem] ml-0.5">HESSEN</span>
        </header>
        <div v-if="unrecoverableAPIError !== null" class="fixed w-full h-[90vh] grid place-content-center top-[5vh]">
            <div id="api-error-display" class="basic-card px-4 overflow-y-scroll">
                <h1>Fehler beim Laden</h1>
                <p>{{ unrecoverableAPIError.message }}</p>
                <pre class="whitespace-pre-wrap" v-html="unrecoverableAPIError.response"></pre>
                <button class="button-with-symbol" onclick="location.reload()">
                    <ClientOnly>
                        <font-awesome-icon :icon="['fas', 'arrow-rotate-right']"></font-awesome-icon>
                    </ClientOnly>
                    <span>Neu laden</span>
                </button>
            </div>
        </div>
        <div v-else id="main-content">
            <LoginMenu v-if="!credentials"></LoginMenu>
            <main class="grid justify-center py-2 w-screen overflow-y-scroll" v-else-if="unrecoverableAPIError === null">
                <div v-if="tokenValid">
                    <Card
                        type="vplan"
                        gradient="linear-gradient(315deg, #168647 0, #24df62 70%)"
                        :icon="['fas', 'book']"
                        name="Vertretungsplan"></Card>
                    <Card
                        type="splan"
                        gradient="linear-gradient(315deg, #008eff 0, #05e7ec 74%)"
                        :icon="['fas', 'hourglass-half']"
                        name="Stundenplan"></Card>
                    <Card
                        type="messages"
                        gradient="linear-gradient(315deg, #fdbb2d 0, #fda52d 70%)"
                        :icon="['fas', 'envelope-open-text']"
                        name="Direktnachrichten"></Card>
                </div>
                <div v-else>
                    <div class="spinner mt-3 w-full" style="--size: 3rem"></div>
                </div>
            </main>
        </div>
    </div>
</template>

<script lang="ts">
let tokenValid = ref(false);
export default defineComponent({
    name: "App",
    async mounted() {
        // We store which cards are opened in the local storage
        useState<Array<string>>("cards-open", () => JSON.parse(useLocalStorage("cards-open") || "[]"));

        async function attemptLogin() {

            if (!useCredentials().value) return;

            const isValid = await useTokenCheck();
            console.log("Token valid: " + isValid);

            if (useState("api-error").value !== null) return;

            if (isValid) {
                tokenValid.value = true;
                return;
            }

            const login = await useLogin();
            console.log("Login: " + login);
            if (!login) return;
            tokenValid.value = true;

        }

        await attemptLogin();
        if (!tokenValid.value)
            return;

        const moodleLogin = await useMoodleLogin();
        

    }
});
</script>

<script setup lang="ts">
if (process.client) document.addEventListener("load", () => (useState<boolean>("loaded").value = true));
interface Credentials {
    username: string;
    password: string;
    school: number;
    token: string;
}
interface APIError {
    response: string;
    message: string;
}
const unrecoverableAPIError = useState<APIError | null>("api-error", () => null);
const credentials = useCookie<Credentials>("credentials");

function getSchoolBG() {
    if (!credentials.value) return "background: url(https://start.schulportal.hessen.de/img/schulbg/default-lg.png)";

    return `background: url("https://start.schulportal.hessen.de/exporteur.php?a=schoolbg&i=${credentials.value.school}&s=lg")`;
}

useHead({
    title: "Schulportal",
    meta: [
        {
            name: "mobile-web-app-capable",
            content: "yes"
        },
        {
            name: "apple-mobile-web-app-capable",
            content: "yes"
        },
        {
            name: "viewport",
            content: "width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no"
        }
    ],
    link: [
        {
            rel: "manifest",
            href: "manifest.json"
        },
        {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=Bricolage%20Grotesque"
        }
    ]
});
</script>

<style>
pre {
    font-family: monospace;
    span {
        font-family: inherit;
    }
    color: #abb2bf;
    .string {
        color: #7ac379;
    }
    .number {
        color: #d19a66;
    }
    .boolean {
        color: #61afef;
    }
    .null {
        color: #c678dd;
    }
    .key {
        color: #e06c75;
    }
}
#main-content {
    height: calc(100vh - 4rem);
    overflow-y: visible;
}
</style>
