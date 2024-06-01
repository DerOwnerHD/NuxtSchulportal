<template>
    <div
        class="flyout-overlay fixed h-screen w-screen top-0 left-0 opacity-0 z-[200]"
        @click="closeFlyout"
        @touchstart="updateItemSelection"
        @touchmove="updateItemSelection"
        @touchend="endItemSelection">
        <div
            class="flyout rounded-2xl fixed w-[190px] z-[201] opacity-0 scale-100 transition-transform"
            :id="flyout.id"
            :origin="flyout.origin ?? 'top'"
            :orientation="flyout.orientation ?? 'left'"
            :any-selected="selectedItem[0] !== null">
            <div v-if="flyout.groups.length">
                <div class="group" v-for="(group, groupIndex) of removedEmptyGroups" :group-id="groupIndex">
                    <div
                        class="item flex justify-between py-2 px-4 text-black"
                        :class="{
                            selected: selectedItem[0] === groupIndex && selectedItem[1] === index,
                            first: isFirstItem(groupIndex, index),
                            last: isLastItem(groupIndex, index)
                        }"
                        v-for="(item, index) of group"
                        :item-id="index"
                        :disabled="item.disabled">
                        <div class="grid">
                            <span>{{ item.title }}</span>
                            <span v-if="item.text" class="text-xs text-[#736d6c] font-[SPRegular]">
                                {{ item.text }}
                            </span>
                        </div>
                        <font-awesome-icon class="ml-4 self-center" v-if="item.icon" :icon="item.icon"></font-awesome-icon>
                    </div>
                </div>
            </div>
            <div v-else class="py-2 px-4 w-full">Keine Schnellaktionen verfügbar</div>
        </div>
        <!--
        <div
            class="fixed z-[202] scale-105"
            v-if="parent"
            v-html="parent.element.outerHTML"
            :style="`top: ${parent.y}px; left: ${parent.x}px;`"></div>
        -->
    </div>
</template>

<script setup lang="ts">
const emit = defineEmits(["submit"]);
const flyout = useFlyout();
// Prevents empty groups from showing up (thus adding a bar to i.e. the bottom and breaking the layout)
// -> happens in splan dock flyout when plan hasn't loaded yet
const removedEmptyGroups = computed(() => {
    if (!flyout.value) return [];
    return flyout.value.groups.filter((group) => group.length);
});
const MARGIN_TO_SCREEN_BORDER = 20;
const flyoutDimensions = ref<DOMRect>();
const initialized = ref(false);
onMounted(async () => {
    await nextTick();
    const element = document.querySelector(`.flyout#${flyout.value.id}`) as HTMLElement;
    if (element === null) return console.error("Couldn't find flyout we've just mounted");
    const dimensions = element.getBoundingClientRect();
    const [x, y] = flyout.value.position;
    const securedX = Math.max(Math.min(x, window.innerWidth - MARGIN_TO_SCREEN_BORDER - FLYOUT_WIDTH), MARGIN_TO_SCREEN_BORDER);
    const securedY =
        flyout.value.origin !== "bottom"
            ? Math.max(Math.min(y, window.innerHeight - MARGIN_TO_SCREEN_BORDER - dimensions.height), MARGIN_TO_SCREEN_BORDER)
            : y - dimensions.height;
    element.style.top = securedY + "px";
    element.style.left = securedX + "px";
    element.style.opacity = "1";
    await useWait(300);
    const groups = Array.from(element.querySelectorAll(".group[group-id]"));
    groups.forEach((group, groupIndex) => {
        hitboxes.value = hitboxes.value.concat(
            Array.from(group.querySelectorAll(".item[item-id]")).map((element, elementIndex) => {
                const dimension = element.getBoundingClientRect();
                return {
                    start: dimension.y,
                    end: dimension.y + dimension.height,
                    group: groupIndex,
                    item: elementIndex
                };
            })
        );
    });
    flyoutDimensions.value = element.getBoundingClientRect();
    initialized.value = true;
});

const hitboxes = ref<{ start: number; end: number; group: number; item: number }[]>([]);

const parent = computed(() => {
    return null;
    /*
    const parent = flyout.value.element;
    if (!parent) return null;
    const { x, y } = parent.getBoundingClientRect();
    return { element: parent.cloneNode(true) as HTMLElement, x, y };
    */
});

async function closeFlyout(event: MouseEvent | boolean) {
    if (!initialized.value) return;
    if (typeof event !== "boolean") {
        if (!(event.target instanceof HTMLElement)) return;
        if (event.target.closest(".flyout")) return;
    }
    document.querySelector(".flyout-overlay")?.classList.add("close");
    await useWait(300);
    // @ts-ignore
    flyout.value = null;
}

const selectedItem = ref<number[] | null[]>([null, null]);
const lastYPosition = ref<number>(0);
const REQUIRED_MOVE_THRESHOLD = 20;
const ALLOWED_X_DISTANCE = 40;
function updateItemSelection(event: TouchEvent) {
    if (!initialized.value) return;
    const { clientX, clientY } = event.touches[0];
    if (Math.abs(clientY - lastYPosition.value) < REQUIRED_MOVE_THRESHOLD) return;
    lastYPosition.value = clientY;
    const { x } = flyoutDimensions.value as DOMRect;
    if (clientX < x - ALLOWED_X_DISTANCE || clientX > x + FLYOUT_WIDTH + ALLOWED_X_DISTANCE) return (selectedItem.value = [null, null]);
    const item = hitboxes.value.find((item) => item.start <= clientY && item.end >= clientY);
    if (!item) return (selectedItem.value = [null, null]);
    selectedItem.value = [item.group, item.item];
}

function isLastItem(group: number, item: number) {
    return flyout.value.groups.length === group + 1 && flyout.value.groups[group].length === item + 1;
}

function isFirstItem(group: number, item: number) {
    return group === 0 && item === 0;
}

function endItemSelection() {
    if (!initialized.value) return;
    const [group, item] = selectedItem.value;
    if (group !== null && item !== null) {
        const data = flyout.value.groups[group][item];
        if (!data.disabled) {
            if (data.action) data.action();
            closeFlyout(true);
        }
    }
    lastYPosition.value = 0;
    selectedItem.value = [null, null];
}
</script>

<style scoped>
.flyout-overlay {
    animation: opacity-in 400ms ease-in-out forwards;
}
.flyout-overlay.close {
    animation: opacity-out 400ms ease-in-out forwards;
}
.flyout {
    font-family: "SPSemiBold";
    animation-delay: 100ms;
    animation: scale-in var(--fast-easing-function) 200ms;
    background: linear-gradient(135deg, #d8e1e6 0%, #cbc2ca 100%);
    .item:not(:first-child) {
        border-top: solid 2px #c4c4c4;
    }
    .item.selected {
        background: #00000015;
    }
    .item.first {
        @apply rounded-t-2xl;
    }
    .item.last {
        @apply rounded-b-2xl;
    }
    .item[disabled="true"] {
        opacity: 50%;
    }
    .group:not(:first-child) {
        border-top: solid 5px #c1bec3;
    }
}
.flyout[origin="top"][orientation="left"] {
    transform-origin: top left;
}
.flyout[origin="bottom"][orientation="left"] {
    transform-origin: bottom left;
}
.flyout[origin="top"][orientation="right"] {
    transform-origin: top right;
}
.flyout[origin="bottom"][orientation="right"] {
    transform-origin: bottom right;
}
@keyframes scale-in {
    1% {
        transform: scale(0);
    }
    100% {
        transform: scale(1);
    }
}
@keyframes opacity-in {
    0% {
        opacity: 0;
    }
    100% {
        opacity: 1;
    }
}
@keyframes opacity-out {
    0% {
        opacity: 1;
    }
    100% {
        opacity: 0;
    }
}
</style>
