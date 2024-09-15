<template>
    <div class="dock-gradient w-screen h-24 fixed bottom-0 left-0 z-[100] pointer-events-none"></div>
    <div
        class="dock fixed bottom-4 h-24 w-80 mx-4 px-4 rounded-2xl z-[101] justify-evenly gap-5"
        :class="{ 'items-center flex': !compactItemsHidden, fullscreen: compactItemsHidden }"
        ref="container"
        @touchstart.passive="startScrolling"
        @touchmove.passive="handleScroll"
        @touchend.passive="endScroll">
        <template v-for="{ id, route, compact_mode, icon, name, flyout, hide_notifications } of apps">
            <DockItem
                v-if="compact_mode"
                :disabled="isScrolling"
                :class="{ hidden: compactItemsHidden }"
                :flyout="flyout?.value ?? []"
                ref="items"
                :route="route"
                :name="name"
                :id="id"
                :hide-notifications="hide_notifications"
                type="compact">
                <NuxtImg :src="icon"></NuxtImg>
            </DockItem>
            <DockItem
                :disabled="isScrolling"
                :class="{ hidden: !compactItemsHidden }"
                class="opacity-0 h-fit"
                :flyout="flyout?.value ?? []"
                ref="full-items"
                :route="route"
                :name="name"
                :id="id"
                :hide-notifications="hide_notifications"
                type="full"
                @click="toggleFullscreenView('down')">
                <NuxtImg class="justify-self-center" :src="icon"></NuxtImg>
            </DockItem>
        </template>
    </div>
</template>

<script setup lang="ts">
const apps = useApps();

const element = useTemplateRef("container");
const items = useTemplateRef("items");
const fullItems = useTemplateRef("full-items");
const BASE_HEIGHT = 96;
/**
 * The velocity calculated represents the percentage of the screen the container will grow/shrink
 * by each second with the current movement (time since last event was fired).
 */
const VELOCITY_THRESHOLD = 0.75;
const MIN_SCROLL_PERCENTAGE = 0.5;
const initialYPos = ref(0);
const scrollPercentage = ref(0);
const isScrolling = ref(false);
const scrollVelocity = ref(0);
const lastEventOffset = ref(0);
const lastEventTimestamp = ref(0);
const isContainerFullSized = ref(false);
const compactItemsHidden = ref(false);
const maxHeight = computed(() => (import.meta.client ? window.innerHeight - 32 - 64 : 0));
function startScrolling(event: TouchEvent) {
    const pos = event.touches[0].clientY;
    initialYPos.value = pos;
    lastEventOffset.value = 0;
    scrollPercentage.value = isContainerFullSized.value ? 1 : 0;
    lastEventTimestamp.value = performance.now();
}
function handleScroll(event: TouchEvent) {
    isScrolling.value = true;
    const offset = isContainerFullSized.value ? event.touches[0].clientY - initialYPos.value : initialYPos.value - event.touches[0].clientY;
    const percentage = (isContainerFullSized.value ? maxHeight.value - offset : offset + BASE_HEIGHT) / maxHeight.value;
    scrollVelocity.value = Math.abs((offset - lastEventOffset.value) / (performance.now() - lastEventTimestamp.value));
    scrollPercentage.value = percentage;
    if (!element.value || !items.value || !fullItems.value) return;
    element.value.style.height = `${clampNumber(maxHeight.value * percentage, BASE_HEIGHT, maxHeight.value)}px`;
    const itemOpacity = clampNumber(1 - percentage * 2, 0, 1);
    compactItemsHidden.value = itemOpacity === 0;
    for (const item of items.value) {
        if (!item) continue;
        item.$el.style.opacity = itemOpacity.toFixed(2);
    }
    const fullItemOpacity = percentage >= 0.75 ? clampNumber((percentage - 0.75) / 0.25, 0, 1) : 0;
    for (const item of fullItems.value) {
        if (!item) continue;
        item.$el.style.opacity = fullItemOpacity.toFixed(2);
    }
}
async function endScroll() {
    if (!isScrolling.value) return;
    isScrolling.value = false;
    const shouldSwitchSide = scrollVelocity.value >= VELOCITY_THRESHOLD || scrollPercentage.value >= MIN_SCROLL_PERCENTAGE;
    const shouldGoDown = (shouldSwitchSide && isContainerFullSized.value) || (!shouldSwitchSide && !isContainerFullSized.value);
    toggleFullscreenView(shouldGoDown ? "down" : "up");
}
const ANIMATION_DURATION = 200;
async function toggleFullscreenView(direction: "up" | "down" = "up") {
    const shouldGoDown = direction === "down";
    if (!element.value || !items.value || !fullItems.value) return;
    const newHeight = `${shouldGoDown ? BASE_HEIGHT : maxHeight.value}px`;
    const animation = element.value.animate({ height: newHeight }, { duration: ANIMATION_DURATION, easing: "ease-out", fill: "forwards" });
    const toggleOpacity = async (element: HTMLElement, opacity: string) => {
        const animation = element.animate({ opacity }, { duration: ANIMATION_DURATION, easing: "ease-out", fill: "forwards" });
        await useWait(ANIMATION_DURATION);
        element.style.opacity = opacity;
        animation.cancel();
    };
    for (const item of items.value) {
        if (!item) continue;
        toggleOpacity(item.$el, `${shouldGoDown ? 1 : 0}`);
    }
    for (const item of fullItems.value) {
        if (!item) continue;
        toggleOpacity(item.$el, `${shouldGoDown ? 0 : 1}`);
    }
    await useWait(ANIMATION_DURATION);
    isContainerFullSized.value = direction === "up";
    compactItemsHidden.value = !shouldGoDown;
    if (element.value) element.value.style.height = newHeight;
    animation.cancel();
}

watch(isContainerFullSized, (value) => {
    if (import.meta.server) return;
    const body = document.querySelector("body");
    if (!body) return;
    body.style.overscrollBehaviorY = value ? "none" : "";
});
</script>

<style scoped>
.dock {
    background: linear-gradient(135deg, #2b2d2e, #141515);
    border-top: var(--small-white-border);
}
.dock.fullscreen {
    @apply grid place-content-start p-4 grid-cols-4;
}
img {
    @apply pointer-events-none h-16;
}
.dock-gradient {
    background: linear-gradient(to top, #000000a0, transparent);
}
</style>
