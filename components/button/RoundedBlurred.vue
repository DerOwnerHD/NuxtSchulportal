<template>
    <button class="blurred-background flex place-content-center p-2 rounded-full items-center hover:active:scale-90 transition-transform gap-2">
        <font-awesome-icon v-if="icon" :icon="icon"></font-awesome-icon>
        <slot />
    </button>
</template>

<script setup lang="ts">
defineProps<{ icon?: string[] }>();
</script>
