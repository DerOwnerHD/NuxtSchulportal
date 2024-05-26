<template>
    <div :style="{ '--size': size + 'px' }"></div>
</template>

<script setup lang="ts">
defineProps<{ size: number }>();
</script>

<style scoped>
div {
    background: url("https://i.imgur.com/NCYL2PJ.png") no-repeat;
    height: var(--size);
    width: var(--size);
    background-size: var(--size);
    animation: 900ms spin infinite linear;
}
</style>
