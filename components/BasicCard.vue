<template>
    <div class="flex w-screen justify-center">
        <div class="basic-card w-80 shadow-lg rounded-xl py-3 px-2 relative" :class="classes">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{ classes?: string }>();
</script>

<style scoped>
.basic-card {
    background: var(--basic-card-background);
    border-top: solid 1px #5b2ae1;
}
</style>
