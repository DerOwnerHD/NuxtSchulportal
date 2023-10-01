<template>
    <div id="moodle-notifications-container" class="fixed overflow-y-scroll w-40 z-20 rounded-md h-[fit-content]">
        <div>
            <div class="flex justify-evenly mt-1 items-center">
                <button @click="switchNotification(-1)">
                    <font-awesome-icon :icon="['fas', 'chevron-left']"></font-awesome-icon>
                </button>
                <p class="text-center">{{ currentNotificationIndex + 1 }} von {{ notifications.length }}</p>
                <button @click="switchNotification(1)">
                    <font-awesome-icon :icon="['fas', 'chevron-right']"></font-awesome-icon>
                </button>
            </div>
            <div v-if="currentNotification" class="px-2">
                <p header-alike class="text-center text-sm">{{ currentNotification.subject }}</p>
                <p class="text-xs text-center mb-1">
                    <b>{{ currentNotification.timestamps.pretty }}</b>
                </p>
                <small class="block leading-3">{{ currentNotification.message.full }}</small>
                <div class="flex justify-center">
                    <button @click="openLink(currentNotification.link)" class="my-1 px-1.5">
                        <font-awesome-icon :icon="['fas', 'up-right-from-square']"></font-awesome-icon>
                        <span class="ml-1">Öffnen</span>
                    </button>
                </div>
            </div>
            <p v-else class="text-center">Nichts gefunden ¯\_(ツ)_/¯</p>
        </div>
    </div>
    <svg id="moodle-notifications-arrow" class="fixed h-2" fill="#000" stroke="#fff" stroke-width="0.2" viewBox="0 0 1 1">
        <path d="M 0 1 L 0.5 0 L 1 1 L 0 1"></path>
    </svg>
</template>

<script setup lang="ts">
const notifications = useState<MoodleNotification[]>("moodle-notifications");
const currentNotificationIndex = ref(0);
const currentNotification = ref<MoodleNotification>(notifications.value[0]);
const position = useState<number[]>("moodle-notifications-pos");

async function switchNotification(direction: 1 | -1) {
    const container = document.querySelector("#moodle-notifications-container");
    if (!(container instanceof HTMLElement)) return;
    if (
        (direction === -1 && currentNotificationIndex.value === 0) ||
        (direction === 1 && currentNotificationIndex.value === notifications.value.length - 1)
    )
        return;
    currentNotificationIndex.value += direction;
    currentNotification.value = notifications.value[currentNotificationIndex.value];
    await useWait(1);
    // We need to use the height of all the children, as
    // when just using the container height as in mounted(),
    // it just gives us the height WITH all the padding
    // we added at the bottom
    if (window.innerHeight - position.value[1] - 60 < (document.querySelector("#moodle-notifications-container > div")?.clientHeight || 0))
        return (container.style.height = window.innerHeight - position.value[1] - 40 + "px");
    container.style.height = "";
}

onMounted(() => {
    if (!position.value) throw new Error("Expected position of MoodleNotifications menu to be set");
    if (window.innerHeight - position.value[1] < 100) return (useState("moodle-notifications-open").value = false);
    document.body.style.overflow = "hidden";

    function detectClick(event: MouseEvent) {
        const target = event.target;
        if (!(target instanceof HTMLElement) || target.closest("#moodle-notifications-container") || target.closest("#moodle-notifications-button"))
            return;
        useState("moodle-notifications-open").value = false;
        document.removeEventListener("click", detectClick);
    }
    document.addEventListener("click", detectClick);

    const container = document.querySelector("#moodle-notifications-container");
    if (!(container instanceof HTMLElement)) return;
    container.style.top = position.value[1] + 30 + "px";
    container.style.left = window.innerWidth - container.clientWidth - position.value[2] / 2 + "px";
    // This is just so the content does not go offscreen
    // Normally it just adjusts to the content, however when it
    // would be too far down, we need to manually set the height
    if (window.innerHeight - position.value[1] - 60 < container.clientHeight)
        container.style.height = window.innerHeight - position.value[1] - 40 + "px";

    const arrow = document.querySelector("#moodle-notifications-arrow");
    if (!(arrow instanceof SVGElement)) return;
    arrow.style.left = position.value[0] - container.clientLeft + 15 + "px";
    arrow.style.top = position.value[1] + 24 + "px";
});

onUnmounted(() => {
    document.body.style.overflow = "";
});
</script>

<style scoped>
#moodle-notifications-container {
    border: solid 1px white;
    background: linear-gradient(to bottom, #212121, #080808);
    button {
        @apply min-w-[1.25rem] h-5 bg-white text-black rounded-full text-sm hover:active:scale-95;
    }
}
</style>
