<script setup lang="ts">
const props = defineProps<{ direction: "x" | "y" }>();
const el = useTemplateRef<HTMLElement>("element");

defineExpose({ update: updateBlending });

onMounted(() => {
    updateBlending();
});

type PropertyAccessor = "scrollSize" | "size" | "offset";
type Properties = "scrollWidth" | "scrollHeight" | "offsetWidth" | "offsetHeight" | "scrollLeft" | "scrollTop";
const propertyAccessors = computed((): Record<PropertyAccessor, Properties> | null => {
    if (!el.value) return null;
    const isHorizontal = props.direction === "x";
    return {
        scrollSize: isHorizontal ? "scrollWidth" : "scrollHeight",
        size: isHorizontal ? "offsetWidth" : "offsetHeight",
        offset: isHorizontal ? "scrollLeft" : "scrollTop"
    };
});

/**
 * Intensity of the mask's alpha channel.
 * The lower, the more fady the view becomes.
 */
const intensity = ref<string[]>(["1", "1"]);

/**
 * Describes how many pixels the distance can be towards the edge
 * of the element's container for the blending to disappear on that side.
 * => the user does not have to scroll to the very end!
 */
const MARGIN = 32;
/**
 * The area from the end of MARGIN to fade a blend slowly in.
 */
const TRANSITION_MARGIN = 72;
const blendedSides = ref<"none" | "both" | "left" | "right">("none");
function updateBlending() {
    const properties = propertyAccessors.value;
    if (!el.value || !properties) return;

    const scrollSize = el.value[properties.scrollSize];
    const size = el.value[properties.size];
    const offset = el.value[properties.offset];

    const isOverflowing = scrollSize > size;
    if (!isOverflowing) {
        blendedSides.value = "none";
        return;
    }

    const toLeft = offset;
    const toRight = scrollSize - size - offset;
    const isAtLeft = toLeft < MARGIN;
    const isAtRight = toRight < MARGIN;

    blendedSides.value = isAtLeft ? (isAtRight ? "none" : "right") : isAtRight ? "left" : "both";

    /**
     * Fades the opacity of the mask slowly from 1 to 0, depending on the distance from the edge.
     * i.e., if the scroll is very close to the top (still not within MARGIN),
     * this intensity value slowly gets larger and larger, ensuring it reaches 100%
     * by the time the view snaps away from "both" to only the lower.
     */
    intensity.value = [toLeft, toRight]
        .map((value) => (blendedSides.value !== "both" ? 0 : 1 - clampNumber((value - MARGIN) / TRANSITION_MARGIN, 0, 1)))
        .map((value) => value.toFixed(3));
}
</script>

<template>
    <div
        ref="element"
        @scroll.passive="updateBlending"
        @scrollend.passive="updateBlending"
        class="scroll-fader min-h-0"
        :class="{
            'overflow-x-scroll': direction === 'x',
            'overflow-y-scroll': direction === 'y'
        }"
        :style="{
            '--intensity-left': intensity[0],
            '--intensity-right': intensity[1]
        }"
        :data-blended-sides="blendedSides"
        :data-direction="direction">
        <slot />
    </div>
</template>

<style scoped>
.scroll-fader {
    mask-image: none;
    mask-mode: alpha;
    --transparent-left: rgba(255, 255, 255, var(--intensity-left));
    --transparent-right: rgba(255, 255, 255, var(--intensity-right));
}
[data-direction="x"] {
    --direction: 90deg;
}
[data-direction="y"] {
    --direction: 0deg;
}
[data-blended-sides="both"] {
    mask-image: linear-gradient(var(--direction), var(--transparent-right) 0%, white 20%, white 80%, var(--transparent-left) 100%);
}
[data-blended-sides="left"] {
    mask-image: linear-gradient(var(--direction), white 80%, var(--transparent-left) 100%);
}
[data-blended-sides="right"] {
    mask-image: linear-gradient(var(--direction), var(--transparent-right) 0%, white 20%);
}
</style>
