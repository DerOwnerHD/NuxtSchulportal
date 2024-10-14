<template>
    <div class="flex gap-2 items-center cursor-pointer select-none flex-wrap" @click="toggle">
        <div class="wrapper rounded-full relative w-14 h-8 border-solid border-4 border-gray-600" :enabled="isEnabled">
            <div class="absolute w-6 h-6 rounded-full bg-white drop-shadow left-0" ref="pointer"></div>
        </div>
        <slot />
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ enabled?: boolean }>();
const emit = defineEmits<{
    update: [value: boolean];
}>();
const pointer = useTemplateRef("pointer");

const isEnabled = ref(props.enabled ?? false);

function toggle() {
    isEnabled.value = !isEnabled.value;
    emit("update", isEnabled.value);
    animate();
}

function animate() {
    pointer.value?.animate(
        { transform: `translateX(${isEnabled.value ? WRAPPER_WIDTH - POINTER_SIZE - BORDER_WIDTH * 2 : 0}px)` },
        { fill: "forwards", duration: 150, easing: "ease-in-out" }
    );
}

onMounted(() => animate());

const POINTER_SIZE = 24;
const WRAPPER_WIDTH = 56;
const BORDER_WIDTH = 4;
</script>

<style scoped>
.wrapper {
    transition: background-color 150ms ease-in-out;
}
.wrapper:not([enabled="true"]) {
    @apply bg-red-500;
}
.wrapper[enabled="true"] {
    @apply bg-green-500;
}
</style>
