<template>
    <div class="w-screen flex justify-center fixed z-[10]">
        <GradientBorder :dialog-box="props.id" class="hidden w-80 rounded-lg my-5">
            <div class="p-3 relative">
                <button class="rounded-button absolute right-3 top-3 w-7 h-7 grid place-content-center" @click="close">
                    <font-awesome-icon :icon="['fas', 'xmark']"></font-awesome-icon>
                </button>
                <slot />
            </div>
        </GradientBorder>
    </div>
</template>

<script setup lang="ts">
import { modifyOpenDialogBoxes } from "~/composables/utils";

const props = defineProps<{ id: string; closeAfter?: number }>();
onMounted(async () => {
    await nextTick();
    const box = document.querySelector(`[dialog-box=${props.id}]`);
    if (!(box instanceof HTMLElement)) return;
    box.animate([{ transform: `translateY(-500px)` }, { transform: "translateY(0px)" }], { duration: 750, easing: "ease-out", fill: "forwards" });
    await nextTick();
    box.classList.remove("hidden");
    if (typeof props.closeAfter !== "number") return;
    await useWait(props.closeAfter);
    close();
});
async function close() {
    const box = document.querySelector(`[dialog-box=${props.id}]`);
    if (!(box instanceof HTMLElement)) return console.error("Cannot close dialog box, somehow...");
    const height = box.clientHeight;
    box.animate([{ transform: "translateY(0px)" }, { transform: `translateY(-${height + 100}px)` }], {
        duration: 500,
        easing: "ease-in",
        fill: "forwards"
    });
    await useWait(500);
    modifyOpenDialogBoxes(props.id);
}
</script>

<style scoped>
.outer {
    --gradient: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%);
}
</style>
