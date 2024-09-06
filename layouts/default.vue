<template>
    <div>
        <div
            id="background"
            class="fixed top-0 z-[-1] overflow-hidden bg-center bg-no-repeat w-screen h-screen"
            :style="{ '--gradient-color': appBackgroundGradient }">
            <div id="overlay"></div>
        </div>
        <OberstufenwahlAlert v-if="isOberstufenWahlOpen"></OberstufenwahlAlert>
        <div class="grid h-screen py-4 max-h-[100vh] w-screen overflow-y-scroll" id="content">
            <SPHHeader></SPHHeader>
            <main class="max-w-[100vw]" :class="{ 'min-h-0': !isPageScrollable }">
                <slot />
            </main>
            <ClientOnly>
                <footer class="flex justify-center w-screen sticky bottom-0 z-40" v-if="authed">
                    <DockContainer></DockContainer>
                </footer>
            </ClientOnly>
        </div>
        <div class="fixed top-0 right-0 gap-2 z-[500] flex opacity-0">
            <button onclick="location.reload()">neu laden</button>
            <button @click="logOff">abmelden</button>
        </div>
        <DockFlyout v-if="flyout"></DockFlyout>
    </div>
</template>

<script setup lang="ts">
import "~/composables/prototype";
const flyout = useFlyout();
const authed = isLoggedIn();

const dialogBoxes = useOpenDialogBoxes();
const isOberstufenWahlOpen = computed(() => dialogBoxes.value.includes("overstufenwahl"));

const NON_SCROLLABLE_PAGES = [/^\/mylessons\/.+$/, /^\/vertretungsplan(\/)?$/];
const isPageScrollable = useScrollabilityStatus();
onRenderTriggered(updatePageScrollability);

async function updatePageScrollability() {
    const { path } = useRoute();
    const isNonScrollable = NON_SCROLLABLE_PAGES.some((pattern) => pattern.test(path));
    await nextTick();
    isPageScrollable.value = !isNonScrollable;
}

const ssrAlerts = useSSRAlerts();
onMounted(() => {
    updatePageScrollability();
    window.addEventListener("contextmenu", (event) => event.preventDefault());
    if (!authed) return;
    fetchVertretungsplan();
    fetchStundenplan();
    fetchMyLessonsCourses();
});

const DEFAULT_BACKGROUND_GRADIENT = "#254e63";
const BACKGROUND_GRADIENTS = [
    { pattern: /^\/vertretungsplan(\/)?$/, color: 0x1fbd54 },
    { pattern: /^\/stundenplan(\/)?$/, color: 0x0000ad },
    { pattern: /^\/mylessons(\/.*)?$/, color: 0x665ef3 }
];
const BACKGROUND_COLOR_MULTIPLIER = 0.5;

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
