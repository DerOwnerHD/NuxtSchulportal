<template>
    <button class="flex items-center">
        <div
            class="h-full flex gap-2 items-center transition-all p-2"
            :class="{ 'hover:active:scale-95 hover:active:opacity-90': !disabled, 'opacity-30': disabled }">
            <font-awesome-icon v-if="icon" :icon="icon"></font-awesome-icon>
            <slot />
        </div>
    </button>
</template>

<script setup lang="ts">
defineProps<{ icon?: string[]; disabled?: boolean }>();
</script>
