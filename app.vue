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
    <BottomSheet v-if="sheetStates.open.includes('messages')" menu="messages"></BottomSheet>
</template>

<script lang="ts">
let tokenValid = ref(false);
export default defineComponent({
    name: "App",
    async mounted() {
        // This would indicate the user isn't logged in
        if (!useCookie("credentials").value) return;
        const apps = ["vplan", "splan", "messages"];
        // We store which cards are opened in the local storage
        useState<Array<string>>("cards-open", () => JSON.parse(useLocalStorage("cards-open") || "[]"));
        useState("app-news", () => apps.reduce((news, app) => ({ ...news, [app]: 0 }), {}));

        await this.login();
        if (!tokenValid.value) return;

        this.loadSplan();

        const moodleLoggedIn = await this.moodleLogin();
        if (!moodleLoggedIn) return;

        await this.loadConversations();
    },
    methods: {
        async login() {
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
        },
        async moodleLogin() {
            const isValid = await useMoodleCheck();
            console.log("Moodle session valid: " + isValid);

            if (useState("api-error").value !== null) return false;
            if (isValid) return true;

            const login = await useMoodleLogin();
            console.log("Moodle login: " + login);

            if (!login) return false;
            return true;
        },
        async loadSplan() {
            const plan = await useStundenplan();
            // The plan is an array - if not it's an error
            if (!Array.isArray(plan)) return (useAppErrors().value.stundenplan = plan);

            useState("splan", () => plan);
        },
        async loadConversations() {
            const conversations: { [type: string]: string | MoodleConversation[]; all: MoodleConversation[] } = {
                personal: await useConversations(),
                groups: await useConversations("groups"),
                favorites: await useConversations("favorites"),
                all: []
            };

            // As we fetch three types of conversations at once, we need to check
            // if any of them are invalid and then show that error to the user
            const conversationsInvalid = Object.values(conversations).reduce((invalid: string, value) => {
                return Array.isArray(value) ? invalid : value;
            }, "");

            if (conversationsInvalid !== "") {
                useAppErrors().value.conversations = conversationsInvalid;
                return;
            }

            let unreadCount = 0;
            Object.values(conversations).forEach((group) => {
                if (typeof group === "string") return;
                group.forEach((conversation) => {
                    if (conversations.all.find((x) => x.id === conversation.id)) return;
                    conversations.all.push(conversation);
                    unreadCount += conversation.unread || 0;
                });
            });

            // We want to sort ALL conversations by latest message
            conversations.all = conversations.all.sort((a, b) => {
                if (!a.messages[0]) return 1;

                if (!b.messages[0] || a.messages[0].timestamp > b.messages[0].timestamp) return -1;
                else return 1;
            });

            useState<{ [app: string]: number }>("app-news").value.messages = unreadCount;
            useState("moodle-conversations", () => conversations);
        }
    }
});
</script>

<script setup lang="ts">
import { MoodleConversation } from "./composables/apps";

interface SheetStates {
    open: string[];
}
interface AppErrorState {
    [app: string]: string | null;
}
// When using anonymous functions and directly declaring object,
// we unfornuatly can't directly write the object, instead having
// to use this ugly return logic
const sheetStates = useState<SheetStates>("sheets", () => {
    return { open: [] };
});
// These app errors can be used on the home screen or on the sheets of
// the corresponding apps, depends on when the error occured, either during
// first load or a later load of the app from the API
const appErrors = useState<AppErrorState>("app-errors", () => {
    return { "moodle-conversations": null };
});
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
