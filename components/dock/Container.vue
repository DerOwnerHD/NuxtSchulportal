<template>
    <div class="dock-gradient w-screen h-24 fixed bottom-0 left-0 z-[100] pointer-events-none"></div>
    <div class="dock flex justify-evenly mx-4 p-4 rounded-2xl gap-5 blurred-background shadow-lg z-[101] relative backdrop-blur-md">
        <template v-for="{ id, route, compact_mode, icon, name, flyout, hide_notifications } of apps">
            <DockItem v-if="compact_mode" :flyout="flyout?.value ?? []" :route="route" :name="name" :id="id" :hide-notifications="hide_notifications">
                <NuxtImg class="max-h-16 h-16 max-w-12" :src="icon"></NuxtImg>
            </DockItem>
        </template>
    </div>
</template>

<script setup lang="ts">
const apps = useApps();
</script>

<style scoped>
img {
    pointer-events: none;
}
.dock-gradient {
    background: linear-gradient(to top, #000000a0, transparent);
}
</style>
