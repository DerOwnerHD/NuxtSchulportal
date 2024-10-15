<template>
    <div class="dock-item relative" ref="item" :class="{ 'h-16': type === 'compact' }">
        <div class="dock-icon relative grid justify-center" @touchstart.passive="startHold" @touchend.passive="stopHold" @click="navigateTo(route)">
            <div
                v-if="!hideNotifications"
                class="absolute -right-1 -top-1 rounded-full shadow-sm text-xs min-w-5 h-5 grid place-content-center font-bold"
                :class="{ 'bg-gray-500': !hasError, 'bg-red-500': hasError }">
                <span v-if="hasError">!</span>
                <InfiniteSpinner v-else-if="notificationsForItem === null" :size="10"></InfiniteSpinner>
                <span v-else>{{ notificationsForItem }}</span>
            </div>
            <slot />
            <p class="text-xs text-center" v-if="props.type === 'full'">
                <PrettyWrap>{{ props.name }}</PrettyWrap>
            </p>
        </div>
        <div class="flex w-full justify-center mt-1">
            <div class="dock-selector h-1 bg-white opacity-50 rounded-full" :class="{ selected: hasItemSelected }"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    id: AppID;
    disabled?: boolean;
    type: "compact" | "full";
    name: string;
    flyout: FlyoutGroup[];
    route: string;
    hideNotifications?: boolean;
}>();

const el = useTemplateRef<HTMLElement>("item");

const notifications = useNotifications();
const notificationsForItem = computed(() => notifications.value.get(props.id) ?? null);
const hasError = computed(() => hasAppError(props.id));

const hasItemSelected = computed(() => useRoute().path.startsWith(props.route));

const isHoldingIcon = ref(false);
async function startHold(event: TouchEvent) {
    if (isHoldingIcon.value || props.disabled || !el.value) return;
    isHoldingIcon.value = true;
    await sleep(1000);
    if (props.disabled) return;
    if (!isHoldingIcon.value || !(event.target instanceof Element)) return;
    /**
     * Safari does not have the feature implemented, Firefox on desktop has also removed it
     * and Firefox for Android does not perform it.
     */
    if ("vibrate" in navigator) navigator.vibrate(100);
    isHoldingIcon.value = false;
    void createFlyout(
        {
            groups: props.flyout
        },
        el.value
    );
}

function stopHold() {
    isHoldingIcon.value = false;
}
</script>

<style scoped>
.dock-icon {
    transition: transform 200ms;
}
.dock-icon:hover:active {
    animation: pulse 800ms;
}
@keyframes pulse {
    50% {
        transform: scale(90%);
    }
}
.dock-selector {
    width: 0;
    transition: width 300ms;
}
.dock-selector.selected {
    width: 15px;
}
.dock-item {
    will-change: opacity;
}
</style>
