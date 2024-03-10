<template>
    <div class="fading-scroll relative" :id="props.id" @touchend="handle">
        <slot />
    </div>
</template>

<script setup lang="ts">
// The amount of pixels that you have to be
// to either ends for the mask to disappear
const END_TOLERANCE = 10;
const accessors = {
    x: {
        size: "offsetWidth",
        full: "scrollWidth",
        pos: "scrollLeft",
        gradients: {
            start: "right",
            end: "left"
        }
    },
    y: {
        size: "offsetHeight",
        full: "scrollHeight",
        pos: "scrollTop",
        gradients: {
            start: "bottom",
            end: "top"
        }
    }
};
const chosenAccessors = computed(() => accessors[props.direction]);
const props = defineProps<{ direction: "x" | "y"; id: string }>();
function handle() {
    const { size, full, pos, gradients } = chosenAccessors.value;
    const element = document.querySelector(`.fading-scroll#${props.id}`);
    if (!(element instanceof HTMLElement)) throw new TypeError("Fading scroll thingy not found, how?");
    // @ts-ignore There is nothing to scroll.
    if (element[size] === element[full]) return;
    // @ts-ignore
    const isAtBeginning = element[pos] <= END_TOLERANCE;
    // @ts-ignore
    const isAtEnd = element[full] - element[pos] - END_TOLERANCE <= element[size];
}
</script>
