<template>
    <div class="h-full min-h-screen">
        <div
            id="background"
            class="fixed top-0 z-[-1] overflow-hidden bg-center bg-no-repeat w-screen h-screen"
            :style="{ '--gradient-color': appBackgroundGradient }">
            <div id="overlay"></div>
        </div>
        <OberstufenwahlAlert v-if="isOberstufenWahlOpen"></OberstufenwahlAlert>
        <div class="grid h-screen py-4 max-h-[100vh] w-screen overflow-y-scroll" id="content">
            <SPHHeader></SPHHeader>
            <main class="max-w-screen mb-24" :class="{ 'min-h-0': !isPageScrollable }">
                <slot />
            </main>
            <footer class="flex justify-center w-screen z-40">
                <ClientOnly>
                    <DockContainer v-if="isLoggedIn"></DockContainer>
                </ClientOnly>
            </footer>
        </div>
        <DockFlyout v-if="flyout"></DockFlyout>
    </div>
</template>

<script setup lang="ts">
import "~/composables/prototype";
const flyout = useFlyout();

const dialogBoxes = useOpenDialogBoxes();
const isOberstufenWahlOpen = computed(() => dialogBoxes.value.includes("overstufenwahl"));

const NON_SCROLLABLE_PAGES = [/^\/mylessons\/.+$/, /^\/vertretungsplan(\/)?$/];
const isPageScrollable = useScrollabilityStatus();
useRouter().afterEach(async (route) => {
    await nextTick();
    updatePageScrollability(route);
    window?.scrollTo(0, 0);
});

async function updatePageScrollability(route?: any) {
    const { path } = route ?? useRoute();
    const isNonScrollable = NON_SCROLLABLE_PAGES.some((pattern) => pattern.test(path));
    await nextTick();
    isPageScrollable.value = !isNonScrollable;
}

const apps = useApps();

onMounted(() => {
    updatePageScrollability();
    window.addEventListener("contextmenu", (event) => event.preventDefault());
    if (!isLoggedIn.value) return;
    for (const app of apps.value) {
        if (app.load_on_mount) app.load_function();
    }
});

const backgroundGradients = useBackgroundGradients();

const appBackgroundGradient = computed(() => {
    const site =
        backgroundGradients.find((site) => site.type === "page" && site.pattern?.test(useRoute().path)) ??
        backgroundGradients.find((site) => site.type === "default");
    const channels = getRGBValues(site?.color ?? 0x000000);
    return combineRGBValues(multiplyRGBValues(channels, useBackgroundColorMultiplier()));
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
