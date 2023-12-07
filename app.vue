<template>
    <div>
        <SecretButton></SecretButton>
        <div id="background" class="fixed">
            <div id="overlay" :style="getSchoolBG()"></div>
        </div>
        <header id="header" class="fixed w-screen h-16 rounded-b-xl drop-shadow-md flex place-items-center place-content-center text-white">
            <span class="text-3xl">Schulportal</span>
            <span class="mt-[-0.75rem] ml-0.5">HESSEN</span>
        </header>
        <div v-if="criticalAPIError !== null" id="api-error" class="fixed w-full h-[90vh] grid place-content-center top-[5vh]">
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
            <LoginMenu v-if="!loggedIn"></LoginMenu>
            <main class="grid justify-center py-2 w-screen overflow-y-scroll" v-else-if="criticalAPIError === null">
                <ClientOnly>
                    <CardList></CardList>
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
                </ClientOnly>
            </main>
        </div>
    </div>
    <BottomSheet v-for="sheet of sheetStates.open" :menu="sheet"></BottomSheet>
    <InfoDialog v-if="useInfoDialog().value"></InfoDialog>
    <ClientOnly>
        <NotificationManager v-if="notificationMananger"></NotificationManager>
    </ClientOnly>
    <MoodleNotifications v-if="moodleNotificationsOpen"></MoodleNotifications>
</template>

<script setup lang="ts">
import { callWithNuxt } from "nuxt/app";
import SecretButton from "./components/utils/SecretButton.vue";
const loggedIn = useState("logged-in", () => false);
// On the server, we only want to be processing basic SPH login
// Does not include any API calls for apps, nor Moodle nor keygen
// for messages (not yet) and lessons decryption
// The SSR shouldn't take long (only a couple 100ms)
// and login always takes about 300-400ms
onServerPrefetch(async () => {
    const nuxt = useNuxtApp();
    const credentials = useCredentials();
    // Due to us not being logged in, we do not process any
    // the loggedIn state will not get set to true
    // -> thus the login screen gets shown
    if (!credentials.value) return;
    const alreadyLoggedIn = await useTokenCheck(useToken().value);
    if (alreadyLoggedIn) return (loggedIn.value = true);
    // This would also just cause the user to
    // be prompted back towards the login screen
    const hasLoginSucceeded = await callWithNuxt(nuxt, useLogin, [false]);
    if (!hasLoginSucceeded) return;
    // After this the client will take over and actually
    // start loading all the apps, Moodle and such
    loggedIn.value = true;
});

onMounted(async () => {
    // It has not worked on the server side
    if (!loggedIn.value) return;
    // These are all required for storing the news count
    const apps = ["vplan", "splan", "messages", "moodle", "lessons"];
    useState("app-news", () => apps.reduce((news, app) => ({ ...news, [app]: 0 }), {}));
    // We store which cards are opened in the local storage
    useState<Array<string>>("cards-open", () => JSON.parse(useLocalStorage("cards-open") || "[]"));
    // All this can be loaded syncronously, as it all just requires
    // us to be logged into the SPH, not Moodle
    loadSplan();
    loadVplan();
    loadMyLessons();
    const moodleLoggedIn = await moodleLogin();
    if (!moodleLoggedIn) return;
    // All of these are Moodle specific things, thus only being
    // loaded after obtaining Moodle credentials
    loadConversations();
    loadMoodleCourses();
    loadMoodleEvents();
    loadMoodleNotifications();
});

const errors = useAppErrors();
async function moodleLogin() {
    const hasValidToken = await useMoodleCheck();
    console.log("Moodle session valid: " + hasValidToken);
    // If previously something had already failed to load,
    // no longer even bother trying to log into Moodle
    if (useState("api-error").value !== null) return false;
    // Moodle tokens tend to only expire after a pretty long
    // time (actually visible in /api/moodle/check)
    if (hasValidToken) return true;
    const hasAuthed = await useMoodleLogin();
    console.log("Moodle login: " + hasAuthed);
    return hasAuthed;
}
// Errors are most often represented as the error
// details string which gets returned by the API
async function loadSplan() {
    const plan = await useStundenplan();
    if (typeof plan === "string") return (errors.value.splan = plan);
    if (plan.length > 1) useAppNews().value.splan = plan.length - 1;
    useState("splan", () => plan);
}
async function loadVplan() {
    const plan = await useVplan();
    if (typeof plan === "string") return (errors.value.vplan = plan);
    useState("vplan", () => plan);
    useAppNews().value.vplan = plan.days.reduce((acc, day) => (acc += day.vertretungen.length), 0);
}
async function loadMoodleEvents() {
    const events = await useMoodleEvents();
    if (typeof events === "string") return (errors.value["moodle-events"] = events);
    useAppNews().value.moodle += events.length;
    useState("moodle-events", () => events);
}
async function loadMoodleNotifications() {
    const notifications = await useMoodleNotifications();
    if (typeof notifications === "string") return (errors.value["moodle-notifications"] = notifications);
    useAppNews().value.moodle += notifications.filter((notification) => notification.read).length;
    useState("moodle-notifications", () => notifications);
}
async function loadMoodleCourses() {
    const courses = await useMoodleCourses();
    if (typeof courses === "string") return (errors.value["moodle-courses"] = courses);
    useState("moodle-courses", () => courses);
}
async function loadAESKey() {
    const key = await useAESKey();
    if (key === null || !/^[A-Za-z0-9/\+=]{88}$/.test(key)) return;
    useState("aes-key", () => key);
    useLocalStorage("aes-key", key);
}
async function loadMyLessons() {
    const courses = await useMyLessons();
    if (typeof courses === "string" || !courses.courses) return (errors.value.mylessons = courses.toString());
    useState("mylessons", () => courses);
    useAppNews().value.lessons = courses.courses.filter((course) => course.last_lesson?.homework && !course.last_lesson.homework.done).length;
}
async function loadConversations() {
    const conversations: { [type: string]: string | MoodleConversation[]; all: MoodleConversation[] } = {
        personal: await useConversations(),
        groups: await useConversations("groups"),
        favorites: await useConversations("favorites"),
        all: []
    };
    // As we fetch three types of conversations at once, we need to check
    // if any of them are invalid and then show an error to the user
    const anyTypeIsInvalid = Object.values(conversations).some((value) => !Array.isArray(value));
    if (anyTypeIsInvalid) return (errors.value.conversations = "Fehler");
    let unreadCount = 0;
    Object.values(conversations).forEach((group) => {
        if (typeof group === "string") return;
        group.forEach((conversation) => {
            if (conversations.all.find((x) => x.id === conversation.id)) return;
            conversations.all.push(conversation);
            unreadCount += conversation.unread || 0;
        });
    });
    // We want to sort ALL conversation types by latest message
    conversations.all = conversations.all.sort((a, b) => {
        if (!a.messages[0]) return 1;

        if (!b.messages[0] || a.messages[0].timestamp > b.messages[0].timestamp) return -1;
        else return 1;
    });
    useAppNews().value.messages = unreadCount;
    useState("moodle-conversations", () => conversations);
}
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
const moodleNotificationsOpen = useState("moodle-notifications-open", () => false);
useState("cards", () => [
    { id: "vplan", gradient: "linear-gradient(270deg, #168647 0, #24df62 70%)", icon: ["fas", "book"], name: "Vertretungsplan", index: 0 },
    { id: "splan", gradient: "linear-gradient(270deg, #008eff 0, #05e7ec 74%)", icon: ["fas", "hourglass-half"], name: "Stundenplan", index: 1 },
    { id: "moodle", gradient: "linear-gradient(315deg, #ff4e00 0, #ec9f05 74%)", icon: ["fas", "cloud"], name: "SchulMoodle", index: 2 },
    {
        id: "messages",
        gradient: "linear-gradient(270deg, #e14646 0, #fd6c2d 70%)",
        icon: ["fas", "envelope-open-text"],
        name: "Direktnachrichten",
        index: 3
    },
    { id: "lessons", gradient: "linear-gradient(90deg, #6a61f8 0%, #4f49d1 100%)", icon: ["fas", "address-book"], name: "Mein Unterricht", index: 4 }
]);
useState<boolean>("card-switching", () => false);
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

async function logout() {
    const stop = confirm("Willst du dich wirklich abmelden?");
    if (!stop) return;

    if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();

        if (subscription != null) await subscription.unsubscribe();
        if (registration != null) await registration.unregister();
    }

    // Credits to https://stackoverflow.com/questions/179355/clearing-all-cookies-with-javascript
    // => useCookie("<anything>").value = null does not work for some reason...
    function deleteAllCookies() {
        const cookies = document.cookie.split(";");
        for (const cookie of cookies) {
            const equals = cookie.indexOf("=");
            const name = equals > -1 ? cookie.substring(0, equals) : cookie;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
    }
    deleteAllCookies();
    useLocalStorage("aes-key", null);
    useInfoDialog().value = {
        header: "Abmeldung erfolgreich",
        disappearAfter: 2000,
        icon: "done.png",
        details: "Erneute Anmeldung jederzeit möglich"
    };
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
        },
        {
            rel: "apple-touch-icon",
            href: "icon.png"
        },
        {
            rel: "apple-touch-startup-image",
            href: "icon.png"
        }
    ]
});
</script>
