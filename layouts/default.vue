<template>
    <div>
        <div
            id="background"
            class="fixed top-0 z-[-1] overflow-hidden bg-center bg-no-repeat w-screen h-screen"
            :style="{ '--gradient-color': appBackgroundGradient }">
            <div id="overlay"></div>
        </div>
        <OberstufenwahlAlert v-if="isOberstufenWahlOpen"></OberstufenwahlAlert>
        <div class="grid h-screen max-h-[100vh] w-screen py-4 overflow-y-scroll" id="content">
            <SPHHeader></SPHHeader>
            <main class="max-w-[100vw]">
                <slot />
            </main>
            <footer class="flex justify-center w-screen sticky bottom-4" v-if="authed">
                <DockContainer></DockContainer>
            </footer>
        </div>
        <div class="fixed top-0 right-0 gap-2 z-[500] flex opacity-0">
            <button onclick="location.reload()">neu laden</button>
            <button @click="logOff">abmelden</button>
        </div>
        <DockFlyout v-if="flyout"></DockFlyout>
    </div>
</template>

<script setup lang="ts">
const SPH_BASE = "https://start.schulportal.hessen.de";
const DEFAULT_BG_LOCATION = "/img/schulbg/default-lg.png";

const flyout = useFlyout();

const authed = isLoggedIn();
const credentials = useCredentials();
const background = computed(
    () =>
        `background-image: url("${SPH_BASE}/${credentials.value ? `exporteur.php?a=schoolbg&s=lg&i=${credentials.value.school}` : DEFAULT_BG_LOCATION}")`
);

const dialogBoxes = useOpenDialogBoxes();
const isOberstufenWahlOpen = computed(() => dialogBoxes.value.includes("overstufenwahl"));

const ssrAlerts = useSSRAlerts();
onMounted(() => {
    if (!authed) return;
    fetchVertretungsplan();
    fetchMyLessonsCourses();
});

const DEFAULT_BACKGROUND_GRADIENT = "#254e63";
const BACKGROUND_GRADIENTS = [
    { pattern: /\/vertretungsplan/, color: 0x1fbd54 },
    { pattern: /\/mylessons(\/.*)?/, color: 0x665ef3 }
];
const BACKGROUND_COLOR_MULTIPLIER = 0.4;

const appBackgroundGradient = computed(() => {
    const site = BACKGROUND_GRADIENTS.find((site) => site.pattern.test(useRoute().path));
    if (!site) return DEFAULT_BACKGROUND_GRADIENT;
    const channels = getRGBValues(site.color);
    return combineRGBValues(multiplyRGBValues(channels, BACKGROUND_COLOR_MULTIPLIER));
});
</script>

<style scoped>
#content {
    grid-template-rows: auto 1fr auto;
}
@property --gradient-color {
    syntax: "<color>";
    initial-value: #030303;
    inherits: false;
}
#background {
    background-image: radial-gradient(var(--gradient-color), #030303);
    transition: --gradient-color 500ms;
}
#background #overlay {
    background: linear-gradient(to bottom, #03030375, #03030399);
    height: inherit;
    width: inherit;
}
</style>
