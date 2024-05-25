<template>
    <div
        class="scrolling-text whitespace-nowrap relative"
        :scrolling-text-id="id"
        :style="{ font, '--length': scrollLength + 'px', '--container-size': containerSize + 'px', '--duration': duration + 'ms' }"
        :animated="isMoving">
        <slot />
        <span class="px-5" v-if="isMoving"></span>
        <slot v-if="isMoving" />
    </div>
</template>

<script setup lang="ts">
const id = ref(Math.round(Math.random() * 1000));
const props = defineProps<{ font?: string }>();
const scrollLength = ref(0);
const isMoving = ref(false);
const containerSize = ref(0);
const duration = ref(0);
const MARGIN = 50;
const PIXEL_PER_SECOND = 8;
onMounted(async () => {
    const element = document.querySelector<HTMLElement>(`.scrolling-text[scrolling-text-id="${id.value}"]`);
    if (element === null) return;
    const parent = element.parentElement;
    if (parent == null) return;
    await useWait(100);
    const width = measureTextWidth(element.innerText, props.font);
    if (width === null) return;
    const parentWidth = parent.getBoundingClientRect().width;
    if (width - MARGIN <= parentWidth) return;
    // 40 pixels is the width of the spacer element
    scrollLength.value = -(width - parentWidth + 40);
    containerSize.value = -parentWidth;
    duration.value = Math.floor((scrollLength.value / -PIXEL_PER_SECOND) * 1000);
    isMoving.value = true;
});
</script>

<style scoped>
.scrolling-text[animated="true"] {
    animation: panning infinite var(--duration) linear;
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
