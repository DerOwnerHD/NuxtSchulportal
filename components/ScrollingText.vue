<template>
    <div
        class="scrolling-text whitespace-nowrap relative"
        ref="element"
        :style="{
            font,
            '--length': scrollLength + 'px',
            '--container-size': containerSize + 'px',
            '--duration': duration + 'ms',
            '--animation-delay': startDelay + 'ms'
        }"
        :data-animated="isMoving">
        <slot />
        <span class="px-5" v-if="isMoving"></span>
        <slot v-if="isMoving" />
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ font?: string; startDelay?: number; pixelsPerSecond?: number }>();
const scrollLength = ref(0);
const isMoving = ref(false);
const containerSize = ref(0);
const duration = ref(0);
const MARGIN = 0;
const PIXELS_PER_SECOND = 8;
const element = useTemplateRef("element");
onMounted(async () => {
    if (element.value === null) return;
    const parent = element.value.parentElement;
    if (parent == null) return;
    await useWait(100);
    const width = measureTextWidth(element.value.innerText, props.font);
    if (width === null) return;
    const parentWidth = parent.getBoundingClientRect().width;
    if (width - MARGIN <= parentWidth) return;
    // 40 pixels is the width of the spacer element
    scrollLength.value = -(width - parentWidth + 40);
    containerSize.value = -parentWidth;
    duration.value = Math.floor((scrollLength.value / -(props.pixelsPerSecond ?? PIXELS_PER_SECOND)) * 1000);
    isMoving.value = true;
});
</script>

<style scoped>
.scrolling-text[data-animated="true"] {
    animation: panning infinite var(--duration) linear;
    animation-delay: var(--animation-delay);
}
@keyframes panning {
    0% {
        transform: translateX(0px);
    }
    99.999% {
        transform: translateX(calc(var(--length) + var(--container-size)));
    }
    100% {
        transform: translateX(var(--container-size));
    }
}
</style>
