<template>
    <section class="p-4 bg-white shadow-md overflow-clip" :style="{ background }">
        <slot />
    </section>
</template>

<script setup lang="ts">
const props = defineProps<{ background: string }>();
</script>

<style scoped>
section {
    border-radius: 10%;
}
</style>
