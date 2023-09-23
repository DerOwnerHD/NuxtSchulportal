<template>
    <div>
        <button class="absolute bg-white z-10 top-0 opacity-0" onclick="location.reload()">Neu laden</button>
        <button class="absolute bg-white z-10 top-0 right-0 opacity-0" @click="useCredentials<any>().value = null">Neu laden</button>
        <div id="background" class="fixed">
            <div id="overlay" :style="getSchoolBG()"></div>
        </div>
        <header id="header" class="fixed w-screen h-16 rounded-b-xl drop-shadow-md flex place-items-center place-content-center text-white">
            <span class="text-3xl">Schulportal</span>
            <span class="mt-[-0.75rem] ml-0.5">HESSEN</span>
        </header>
        <div v-if="criticalAPIError !== null" class="fixed w-full h-[90vh] grid place-content-center top-[5vh]">
            <div id="api-error-display" class="basic-card px-4 overflow-y-scroll">
                <h1>Fehler beim Laden</h1>
                <p>{{ criticalAPIError.message }}</p>
                <pre class="whitespace-pre-wrap" v-html="criticalAPIError.response"></pre>
                <button class="button-with-symbol" onclick="location.reload()">
                    <ClientOnly>
                        <font-awesome-icon :icon="['fas', 'arrow-rotate-right']"></font-awesome-icon>
                    </ClientOnly>
                    <span>Neu laden</span>
                </button>
                <button class="button-with-symbol" v-if="criticalAPIError.recoverable" @click="criticalAPIError = null">
                    <ClientOnly>
                        <font-awesome-icon :icon="['fas', 'arrow-right-from-bracket']"></font-awesome-icon>
                    </ClientOnly>
                    <span>Weiter</span>
                </button>
            </div>
        </div>
        <div v-else id="main-content" class="pt-16">
            <LoginMenu v-if="!credentials"></LoginMenu>
            <main class="grid justify-center py-2 w-screen overflow-y-scroll" v-else-if="criticalAPIError === null">
                <div v-if="tokenValid">
                    <Card
                        type="vplan"
                        gradient="linear-gradient(270deg, #168647 0, #24df62 70%)"
                        :icon="['fas', 'book']"
                        name="Vertretungsplan"></Card>
                    <Card
                        type="splan"
                        gradient="linear-gradient(270deg, #008eff 0, #05e7ec 74%)"
                        :icon="['fas', 'hourglass-half']"
                        name="Stundenplan"></Card>
                    <Card type="moodle" gradient="linear-gradient(315deg, #ff4e00 0, #ec9f05 74%)" :icon="['fas', 'cloud']" name="SchulMoodle"></Card>
                    <Card
                        type="messages"
                        gradient="linear-gradient(270deg, #e14646 0, #fd6c2d 70%)"
                        :icon="['fas', 'envelope-open-text']"
                        name="Direktnachrichten"></Card>
                    <Card
                        type="lessons"
                        gradient="linear-gradient(90deg, #6a61f8 0%, #4f49d1 100%);"
                        :icon="['fas', 'address-book']"
                        name="Mein Unterricht"></Card>
                    <div class="flex justify-center my-5">
                        <ClientOnly>
                            <button class="button-with-symbol" @click="logout">
                                <font-awesome-icon :icon="['fas', 'arrow-right-from-bracket']"></font-awesome-icon>
                                <span>Abmelden</span>
                            </button>
                            <button class="button-with-symbol" @click="notificationMananger = true">
                                <font-awesome-icon :icon="['fas', 'bell']"></font-awesome-icon>
                                <span>Benachrichtigungen</span>
                            </button>
                        </ClientOnly>
                    </div>
                </div>
                <div v-else>
                    <div class="spinner mt-3 w-full" style="--size: 3rem"></div>
                </div>
            </main>
        </div>
    </div>
    <BottomSheet v-for="sheet of sheetStates.open" :menu="sheet"></BottomSheet>
    <InfoDialog v-if="useInfoDialog().value"></InfoDialog>
    <ClientOnly>
        <NotificationManager v-if="notificationMananger"></NotificationManager>
    </ClientOnly>
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
        this.loadVplan();
        this.loadMyLessons();

        const moodleLoggedIn = await this.moodleLogin();
        if (!moodleLoggedIn) return;

        this.loadConversations();
        this.loadMoodleCourses();
        this.loadMoodleEvents();
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

            const login = await useLogin(true);
            console.log("Login: " + login);
            if (!login) return;
            tokenValid.value = true;

            await this.loadAESKey();

            await useWait(1000);
            useInfoDialog().value = { ...INFO_DIALOGS.LOGIN, details: `Token: ${useToken().value}` };
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
            if (!Array.isArray(plan)) return (useAppErrors().value.splan = plan);
            if (plan.length > 1) useAppNews().value.splan = plan.length - 1;
            useState("splan", () => plan);
        },
        async loadVplan() {
            const plan = await useVplan();
            if (typeof plan === "string") return (useAppErrors().value.vplan = plan);
            useState("vplan", () => plan);
            useAppNews().value.vplan = plan.days.reduce((acc, day) => (acc += day.vertretungen.length), 0);
        },
        async loadMoodleEvents() {
            const events = await useMoodleEvents();
            if (typeof events === "string") return (useAppErrors().value["moodle-events"] = events);
            useAppNews().value.moodle = events.length;
            useState("moodle-events", () => events);
        },
        async loadMoodleCourses() {
            const courses = await useMoodleCourses();
            if (typeof courses === "string") return (useAppErrors().value["moodle-courses"] = courses);
            useState("moodle-courses", () => courses);
        },
        async loadAESKey() {
            const key = await useAESKey();
            if (key === null) return;
            useState("aes-key", () => key);
            useLocalStorage("aes-key", key);
        },
        async loadMyLessons() {
            const courses = await useMyLessons();
            if (typeof courses === "string") return (useAppErrors().value.mylessons = courses);
            useState("mylessons", () => courses);
            useAppNews().value.lessons = courses.courses.reduce(
                (acc, course) => acc + (course.last_lesson?.homework && !course.last_lesson.homework.done ? 1 : 0),
                0
            );
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

            useAppNews().value.messages = unreadCount;
            useState("moodle-conversations", () => conversations);
        },
        async logout() {
            const stop = confirm("Willst du dich wirklich abmelden?");
            if (!stop) return;

            if ("serviceWorker" in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                const subscription = await registration?.pushManager.getSubscription();

                if (subscription != null) await subscription.unsubscribe();
                if (registration != null) await registration.unregister();
            }

            useCookie("credentials").value = null;
            useCookie("token").value = null;
            useCookie("session").value = null;
            useCookie("moodle-credentials").value = null;
            useLocalStorage("aes-key", null);

            await useWait(1);

            useInfoDialog().value = {
                header: "Abmeldung erfolgreich",
                disappearAfter: 2000,
                icon: "done.png",
                details: "Erneute Anmeldung jederzeit möglich"
            };
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
useState<AppErrorState>("app-errors", () => {
    return {};
});
const notificationMananger = useState<boolean>("notification-manager", () => false);
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
    recoverable: boolean;
}
const criticalAPIError = useState<APIError | null>("api-error", () => null);
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
pre,
code {
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
