<template>
    <div class="wrapper h-screen items-center grid overflow-y-auto py-2" :style="{ '--gradient-color': color }">
        <ErrorDisplay :error="{ error: parseResponseError(error) }" :buttons="buttons"></ErrorDisplay>
    </div>
</template>

<script setup lang="ts">
const buttons = [
    [
        { icon: ["fas", "home"], action: () => navigateTo("/") },
        { icon: ["fas", "arrow-right-from-bracket"], action: () => logOff() }
    ]
];
const error = useError();
const backgroundGradients = useBackgroundGradients();
const gradient = backgroundGradients.find((site) => site.type === "error");
const channels = getRGBValues(gradient?.color ?? 0x000000);
const color = combineRGBValues(multiplyRGBValues(channels, useBackgroundColorMultiplier()));
</script>

<style scoped>
.wrapper {
    background-image: radial-gradient(var(--gradient-color), #030303);
}
</style>
