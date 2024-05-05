<template>
    <div>
        <div id="background" class="fixed top-0">
            <div id="overlay" :style="background"></div>
        </div>
        <header
            id="header"
            class="sticky top-0 w-screen h-16 rounded-b-xl drop-shadow-md flex place-items-center place-content-center"
            @click="navigateTo('/')">
            <span class="text-3xl">Schulportal</span>
            <span class="mt-[-0.75rem] ml-0.5">HESSEN</span>
        </header>
        <OberstufenwahlAlert v-if="isOberstufenWahlOpen"></OberstufenwahlAlert>
        <main>
            <slot />
        </main>
        <div class="fixed top-0 z-[500] flex">
            <button onclick="location.reload()">neu laden</button>
            <button @click="logOff()">abmelden</button>
        </div>
        <DockFlyout v-if="useFlyout().value"></DockFlyout>
        <footer class="fixed flex justify-center bottom-4 w-screen" v-if="authed">
            <DockContainer></DockContainer>
        </footer>
    </div>
</template>

<script setup lang="ts">
const SPH_BASE = "https://start.schulportal.hessen.de";
const DEFAULT_BG_LOCATION = "/img/schulbg/default-lg.png";

const authed = isLoggedIn();
const credentials = useCredentials();
const background = computed(
    () => `background: url("${SPH_BASE}/${credentials.value ? `exporteur.php?a=schoolbg&s=lg&i=${credentials.value.school}` : DEFAULT_BG_LOCATION}")`
);

const dialogBoxes = useOpenDialogBoxes();
const isOberstufenWahlOpen = computed(() => dialogBoxes.value.includes("overstufenwahl"));

const ssrAlerts = useSSRAlerts();
onMounted(() => {
    for (const text of ssrAlerts.value) {
        alert(text);
    }
});
</script>
