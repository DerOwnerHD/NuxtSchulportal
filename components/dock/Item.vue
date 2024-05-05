<template>
    <div class="h-16 relative">
        <div class="dock-icon relative h-16" :class="{ open: isFlyoutOpen }" @touchstart="startHold" @touchend="stopHold">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    id: string;
    name: string;
    subtitle?: string;
    flyout: {
        title: string;
        text?: string;
        icon?: string[];
    }[][];
}>();

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
</style>
