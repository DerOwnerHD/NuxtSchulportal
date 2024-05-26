<template>
    <button
        class="blurred-background flex place-content-center p-2 rounded-full items-center !border-none hover:active:scale-90 transition-transform gap-2">
        <font-awesome-icon v-if="icon" :icon="icon"></font-awesome-icon>
        <span v-if="text">{{ text }}</span>
    </button>
</template>

<script setup lang="ts">
defineProps<{ icon?: string[]; text?: string }>();
</script>
