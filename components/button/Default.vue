<template>
    <button class="rounded-full px-2 h-8 hover:active:scale-95 bg-white justify-center text-black flex gap-1 items-center">
        <font-awesome-icon v-if="icon" :icon="icon"></font-awesome-icon>
        <slot />
    </button>
</template>

<script setup lang="ts">
defineProps<{ icon?: string[] }>();
</script>

<style scoped>
button {
    transition: var(--button-scale-transition);
}
</style>
