<template>
    <div class="fading-scroll h-fit w-fit" :id="props.id">
        <slot />
        <div class="fader fixed top-0 left-0 z-[30] pointer-events-none" :class="classes" v-if="props.enabled()"></div>
    </div>
</template>

<script setup lang="ts">
// The amount of pixels that you have to be
// to either ends for the mask to disappear
const END_TOLERANCE = 10;
const END_FADE_TOLERANCE = 120;
const accessors = {
    x: {
        size: "offsetWidth",
        full: "scrollWidth",
        pos: "scrollLeft",
        gradients: {
            start: "90",
            end: "270",
            both: "90"
        }
    },
    y: {
        size: "offsetHeight",
        full: "scrollHeight",
        pos: "scrollTop",
        gradients: {
            start: "0",
            end: "180",
            both: "180"
        }
    }
};
const chosenAccessors = computed(() => accessors[props.direction]);
const props = defineProps<{
    direction: "x" | "y";
    id: string;
    enabled: () => boolean;
    element?: string;
    init_delay?: number;
    color: () => string;
    classes?: string;
}>();
watch(props.enabled, (value, old) => {
    if (value === old) return;
    const element = document.querySelector(`.fading-scroll#${props.id} .fader`);
    if (!(element instanceof HTMLElement)) return;
    if (!value) {
        return (element.style.background = "");
    }
    handle(null, true);
});
watch(props.color, setColor);
function setColor(color: string) {
    for (const key of Object.keys(GRADIENTS)) {
        // @ts-ignore
        COLORED_GRADIENTS[key] = GRADIENTS[key].replaceAll("[[color]]", color);
    }
}
const GRADIENTS = {
    directional: "linear-gradient([[x]]deg, #[[color]][[y]] 0%, transparent 15%)",
    both: "linear-gradient([[x]]deg, #[[color]][[y]] 0%, transparent 15%, transparent 85%, #[[color]][[z]] 100%)"
};
const COLORED_GRADIENTS = { directional: "", both: "" };
async function handle(_?: any, initial?: boolean) {
    if (!props.enabled()) return;
    const { size, full, pos, gradients } = chosenAccessors.value;
    const element = document.querySelector(props.element ?? `.fading-scroll#${props.id}`);
    if (!(element instanceof HTMLElement)) throw new TypeError("Fading scroll thingy not found, how?");
    const fader = element.querySelector(".fader");
    if (!(fader instanceof HTMLElement)) return;

    // As our fader is fixed, we cannot inherit the size of the parent.
    // In the worst case, the
    fader.style.height = element.clientHeight + "px";
    fader.style.width = element.clientWidth + "px";
    // @ts-ignore There is nothing to scroll.
    if (element[size] === element[full] && !initial) return;

    // @ts-ignore
    const isAtBeginning = element[pos] <= END_TOLERANCE;
    // @ts-ignore
    const isAtEnd = element[full] - element[pos] - END_TOLERANCE <= element[size];

    // @ts-ignore
    const beginningFade = element[pos] <= END_FADE_TOLERANCE ? element[pos] / END_FADE_TOLERANCE : 1;
    const endFade =
        // @ts-ignore
        element[full] - element[pos] - END_FADE_TOLERANCE <= element[size]
            ? // @ts-ignore
              (element[full] - element[pos] - element[size]) / END_FADE_TOLERANCE
            : 1;

    if (!isAtBeginning && !isAtEnd)
        return (fader.style.background = COLORED_GRADIENTS.both
            .replace("[[x]]", gradients.both)
            .replace("[[y]]", replacePlaceholderAlpha(beginningFade))
            .replace("[[z]]", replacePlaceholderAlpha(endFade)));

    if (!isAtBeginning)
        return (fader.style.background = COLORED_GRADIENTS.directional
            .replace("[[x]]", gradients.end)
            .replace("[[y]]", replacePlaceholderAlpha(beginningFade)));

    if (!isAtEnd)
        return (fader.style.background = COLORED_GRADIENTS.directional
            .replace("[[x]]", gradients.start)
            .replace("[[y]]", replacePlaceholderAlpha(endFade)));

    fader.style.background = "";
}
const BASE_ALPHA = 0xa0;
function replacePlaceholderAlpha(fade: number) {
    return Math.round(BASE_ALPHA * fade).toString(16);
}
onMounted(async () => {
    setColor(props.color());
    const element = document.querySelector(props.element ?? `.fading-scroll#${props.id}`);
    element?.addEventListener("scroll", handle);
    window.addEventListener("resize", handle);
    await useWait(80 + (props.init_delay ?? 0));
    handle(null, true);
});
onBeforeUnmount(() => {
    const element = document.querySelector(props.element ?? `.fading-scroll#${props.id}`);
    element?.removeEventListener("scroll", handle);
    window.removeEventListener("resize", handle);
});
</script>

<style scoped>
.fader {
    transition: background 100ms;
}
</style>
