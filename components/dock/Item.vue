<template>
    <div class="dock-item h-16 relative">
        <div
            class="dock-icon relative h-16"
            :class="{ open: isFlyoutOpen }"
            @touchstart.passive="startHold"
            @touchend.passive="stopHold"
            @click="navigateTo(route)">
            <div
                v-if="!hideNotifications"
                class="absolute -right-1 -top-1 rounded-full shadow-sm text-xs min-w-5 h-5 grid place-content-center font-bold"
                :class="{ 'bg-gray-500': !hasError, 'bg-red-500': hasError }">
                <span v-if="hasError">!</span>
                <InfiniteSpinner v-else-if="notificationsForItem === null" :size="10"></InfiniteSpinner>
                <span v-else>{{ notificationsForItem }}</span>
            </div>
            <slot />
        </div>
        <div class="flex w-full justify-center mt-1">
            <div class="dock-selector h-1 bg-white opacity-50 rounded-full" :class="{ selected: hasItemSelected }"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    id: AppID;
    name: string;
    flyout: {
        title: string;
        text?: string;
        icon?: string[];
    }[][];
    route: string;
    hideNotifications?: boolean;
}>();

const notifications = useNotifications();
const notificationsForItem = computed(() => notifications.value.get(props.id) ?? null);
const hasError = computed(() => notificationsForItem.value === -1);

const hasItemSelected = computed(() => useRoute().path.startsWith(props.route));

const isHoldingIcon = ref<string | null>(null);
const isFlyoutOpen = ref(false);
async function startHold(event: TouchEvent) {
    if (isHoldingIcon.value) return;
    // crypto.randomUUID is only available in secure contexts, thus not in a dev enviroment
    const holdingUUID = "randomUUID" in crypto ? crypto.randomUUID() : "a";
    isHoldingIcon.value = holdingUUID;
    await useWait(1000);
    if (isHoldingIcon.value !== holdingUUID || !(event.target instanceof Element)) return;
    const element = event.target.closest(".dock-icon");
    if (element === null) return;
    const dimensions = element.getBoundingClientRect();
    // Safari still does not support vibration
    if ("vibrate" in navigator) navigator.vibrate(100);
    isFlyoutOpen.value = true;
    useFlyout().value = {
        id: `dock-${props.id}`,
        groups: props.flyout,
        position: [dimensions.left, dimensions.top - 10],
        title: props.name,
        origin: "bottom",
        element
    };
}

function stopHold() {
    isHoldingIcon.value = null;
}
</script>

<style scoped>
.dock-icon {
    transition: transform 200ms;
}
.dock-icon:hover:active {
    animation: pulse 800ms;
}
.dock-icon.open {
    z-index: 202;
}
@keyframes pulse {
    50% {
        transform: scale(90%);
    }
}
.dock-selector {
    width: 0px;
    transition: width 300ms;
}
.dock-selector.selected {
    width: 15px;
}
</style>
