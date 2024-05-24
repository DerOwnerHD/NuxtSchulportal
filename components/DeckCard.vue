<template>
    <div
        class="deck-card absolute p-5 w-72 rounded-2xl mx-auto left-0 right-0 h-full overflow-x-clip overflow-y-scroll"
        :style="{ '--color-1': colors[0], '--color-2': colors[1] }">
        <slot />
    </div>
</template>

<script setup lang="ts">
defineProps<{ colors: string[] }>();
</script>

<style scoped>
.deck-card {
    transition-timing-function: cubic-bezier(0.55, 0.42, 0.58, 0.99);
    transition-duration: 300ms;
    transition-property: transform opacity;
    border-top: var(--small-white-border);
    background: radial-gradient(var(--color-1), var(--color-2)) center;
    will-change: transform opacity;
}
.deck-card:not(:first-child) {
    @apply top-0 opacity-50;
}
.deck-card:first-child {
    @apply z-[3];
    transform: rotate(0deg);
}
.deck-card:nth-child(2) {
    @apply z-[2];
    transform: rotate(5deg);
}
</style>
