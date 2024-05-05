<template>
    <button class="rounded-full px-2 h-8 shadow-md hover:active:scale-95 text-black">
        <font-awesome-icon v-if="icon" class="mr-2" :icon="icon"></font-awesome-icon>
        <slot />
    </button>
</template>

<script setup lang="ts">
defineProps<{ icon?: string[] }>();
</script>

<style scoped>
button {
    background: #ffffffd0;
    backdrop-filter: blur(2px);
    transition: var(--button-scale-transition);
}
</style>
