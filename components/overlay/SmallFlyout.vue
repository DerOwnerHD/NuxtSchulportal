<template>
    <div
        class="flyout small-flyout"
        :style="{
            width: `${FLYOUT_WIDTH}px`,
            left: position[0] + 'px',
            top: position[1] + 'px',
            '--horizontal': transformOrigin ? transformOrigin[0] : '',
            '--vertical': transformOrigin ? transformOrigin[1] : ''
        }"
        @touchstart="handleTouchInputs"
        @touchmove="handleTouchInputs"
        @touchend="submitTouchInput"
        :data-open="isFlyoutDisabled ? null : true"
        :data-closing="isFlyoutClosing ? true : null"
        :class="{
            'opacity-0 pointer-events-none': isFlyoutDisabled
        }"
        ref="flyout">
        <section class="grid" v-for="(group, groupIndex) of properties.groups" v-if="hasAnyItems">
            <h2 class="text-center px-2 py-1" v-if="group.title">{{ group.title }}</h2>
            <div
                :data-group-index="groupIndex"
                :data-item-index="index"
                data-small-flyout-item=""
                :data-disabled="item.disabled ? true : null"
                :data-selected="hoveredGroupIndex === groupIndex && hoveredItemIndex === index"
                class="item"
                v-for="(item, index) of group.items"
                ref="items">
                <div>
                    <p>
                        {{ item.title }}
                    </p>
                    <small v-if="item.text">{{ item.text }}</small>
                </div>
                <font-awesome-icon v-if="item.type !== 'expand' && item.icon" :icon="item.icon"></font-awesome-icon>
            </div>
        </section>
        <section class="px-4 py-2" v-if="!hasAnyItems">Keine Aktionen</section>
    </div>
</template>

<script setup lang="ts">
import type { FlyoutProperties } from "~/composables/flyout";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const FLYOUT_WIDTH = 190;

const props = defineProps<{ properties: FlyoutProperties }>();
defineExpose({ inputPosition, getDimensions, finalizeFlyout });

const el = useTemplateRef<HTMLElement>("flyout");

/**
 * The flyout is disabled/hidden as long as createFlyout has not yet
 * passed a position value. It is hidden so the size can be computed
 * without the user seeing a misaligned flyout for a few frames.
 */
const isFlyoutDisabled = ref(true);
const isFlyoutClosing = ref(false);
const position = ref([0, 0]);

const hoveredGroupIndex = ref(-1);
const hoveredItemIndex = ref(-1);

function handleTouchInputs(event: TouchEvent) {
    const touch = event.touches[0];
    if (!touch) return;
    const elFromPoint = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!(elFromPoint instanceof HTMLElement)) return;
    const el = elFromPoint.closest("[data-small-flyout-item]");
    if (el === null) return;

    const indices = ["data-group-index", "data-item-index"].map((attr) => parseInt(el.getAttribute(attr)!));
    if (indices.some((index) => !Number.isSafeInteger(index) || index < 0)) return;
    const [group, item] = indices;
    hoveredGroupIndex.value = group;
    hoveredItemIndex.value = item;
}

async function submitTouchInput() {
    if (hoveredGroupIndex.value === -1 && hoveredItemIndex.value === -1) return;
    const item = props.properties.groups[hoveredGroupIndex.value].items[hoveredItemIndex.value];
    if ("action" in item && typeof item.action === "function" && !item.disabled) void item.action();
    closeFlyout();
}
onUnmounted(() => {
    window.removeEventListener("touchstart", closeFlyoutWithEvent);
});

function closeFlyoutWithEvent(event: Event) {
    const { target } = event;
    if (!(target instanceof HTMLElement) || target.closest(".flyout")) return;
    closeFlyout();
}

async function closeFlyout() {
    isFlyoutClosing.value = true;
    await sleep(400);
    if (unmountPromise.value) unmountPromise.value(null);
}
const unmountPromise = ref<((value: unknown) => void) | null>(null);

type HorizontalOrigin = "left" | "right";
type VerticalOrigin = "top" | "bottom";
const transformOrigin = ref<[HorizontalOrigin, VerticalOrigin] | null>(null);

/**
 * This function is exposed to allow createFlyout to call this.
 */
async function inputPosition([x, y]: number[]) {
    position.value = [x, y];
}

/**
 * This promise will not resolve until the flyout is closed.
 * Then the render function will be called on the wrapper, clearing the component.
 */
async function finalizeFlyout(origin: [HorizontalOrigin, VerticalOrigin]) {
    transformOrigin.value = origin;
    await nextTick();
    isFlyoutDisabled.value = false;
    window.addEventListener("touchstart", closeFlyoutWithEvent, { passive: true });
    return new Promise((resolve) => (unmountPromise.value = resolve));
}

/**
 * This function is exposed for a call from createFlyout.
 */
function getDimensions() {
    if (el.value === null) return null;
    return el.value.getBoundingClientRect();
}

const hasAnyItems = computed(() => props.properties.groups.some((group) => group.items.length));
</script>

<style scoped>
.item:not(:first-child) {
    @apply border-t-2 border-solid;
    border-color: var(--flyout-border);
}

section:not(:first-of-type) .item:first-of-type {
    @apply border-t-4 border-solid;
    border-color: var(--flyout-border);
}

.item {
    @apply flex justify-between px-4 py-2 items-center;
}

.item[data-disabled] {
    @apply opacity-50;
}

.item[data-selected="true"] {
    @apply bg-black bg-opacity-10;
}

small {
    @apply text-gray-500 text-xs block;
    font-family: var(--regular-font), sans-serif;
}

.small-flyout {
    @apply absolute h-auto text-black rounded-2xl drop-shadow-lg pointer-events-auto max-h-screen overflow-y-scroll;
    background: var(--flyout-background);
    font-family: var(--semibold-font), sans-serif;
    /** @ts-ignore */
    transform-origin: var(--horizontal) var(--vertical);
}
.small-flyout[data-open] {
    animation: flyout-open 400ms var(--bounce-bezier);
}

.small-flyout[data-closing] {
    transition-duration: 400ms;
    transition-property: opacity, transform;
    @apply pointer-events-none opacity-0;
}

@keyframes flyout-open {
    from {
        opacity: 0;
        transform: scale(0);
        filter: blur(4px);
    }
    to {
        opacity: 100%;
        transform: scale(100%);
        filter: blur(0);
    }
}
</style>
