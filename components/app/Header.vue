<template>
    <div class="w-screen flex justify-center gap-4 my-4">
        <header class="blurred-background rounded-md flex px-4 py-2 items-center gap-2 text-xl font-bold">
            <NuxtImg class="h-8" :src="icon"></NuxtImg>
            <span>{{ text }}</span>
        </header>
        <div
            class="blurred-background aspect-square rounded-md text-xl h-11 grid place-content-center hover:active:scale-95 app-header-bars"
            @click="openFlyout">
            <font-awesome-icon :icon="['fas', 'bars']"></font-awesome-icon>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ text: string; icon: string; flyout: FlyoutGroups }>();

function openFlyout() {
    const element = document.querySelector(".app-header-bars");
    if (element === null) return console.error("But... you pressed the button (╯°□°)╯︵ ┻━┻");
    const position = element.getBoundingClientRect();
    useFlyout().value = {
        position: [position.x + position.width - FLYOUT_WIDTH, position.y + position.height + 10],
        id: "app-header",
        groups: props.flyout,
        orientation: "right",
        element
    };
}
</script>

<style scoped>
header {
    font-family: "Lucida Sans", "Lucida Sans Regular", "Lucida Grande", "Lucida Sans Unicode", Geneva, Verdana, sans-serif;
}
</style>
