<template>
    <details ref="details">
        <summary class="flex items-center gap-2">
            <font-awesome-icon v-if="icon" :icon="icon"></font-awesome-icon>
            <span>{{ title }}</span>
        </summary>
        <main>
            <slot />
        </main>
    </details>
</template>

<script setup lang="ts">
defineProps<{ icon?: string[]; title?: string }>();
const isOpen = ref(false);
const element = useTemplateRef("details");
</script>
