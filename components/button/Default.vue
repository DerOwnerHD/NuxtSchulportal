<template>
    <button class="bg-white rounded-full px-2 h-8 drop-shadow-md hover:active:scale-95 text-black">
        <font-awesome-icon v-if="icon" class="mr-2" :icon="icon"></font-awesome-icon>
        <slot />
    </button>
</template>

<script setup lang="ts">
defineProps<{ icon?: string[] }>();
</script>
