<template>
    <div class="flex items-center">
        <div class="flex items-center relative" ref="container">
            <div
                v-for="(option, index) of options"
                @click="switchSelection(index)"
                ref="options"
                class="option flex gap-2 rounded-full px-4 py-1 items-center"
                :class="{ 'hover:active:scale-95 hover:active:opacity-90': selected !== index }">
                <div class="px-2 rounded-full bg-gray-500 h-fit" v-if="option.widget">{{ option.widget }}</div>
                <font-awesome-icon v-if="option.icon" :icon="option.icon"></font-awesome-icon>
                <div class="text-center">
                    <h1>{{ option.title }}</h1>
                    <p class="text-sm leading-4">{{ option.subtitle }}</p>
                </div>
            </div>
            <div class="pointer h-full right-0 absolute rounded-full opacity-0" ref="pointer"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ update: [index: number] }>();
defineProps<{ options: { title: string; subtitle?: string; icon?: string[]; default?: boolean; widget?: any }[] }>();
const selected = ref(0);
function switchSelection(index: number) {
    if (index === selected.value) return;
    selected.value = index;
    emit("update", index);
    updatePointerPosition();
}
const pointer = useTemplateRef("pointer");
const container = useTemplateRef("container");
const optionElements = useTemplateRef<HTMLElement[]>("options");
function updatePointerPosition(animate: boolean = true) {
    if (!pointer.value || !container.value || !optionElements.value || optionElements.value.length <= selected.value) return;
    const element = optionElements.value.at(selected.value);
    if (!element) return;
    const { offsetLeft, clientWidth } = element;
    if (!animate) {
        pointer.value.style.left = offsetLeft + "px";
        pointer.value.style.width = clientWidth + "px";
        pointer.value.animate({ opacity: "1" }, { duration: 150, fill: "forwards" });
        return;
    }
    pointer.value.animate(
        {
            left: offsetLeft + "px",
            width: clientWidth + "px"
        },
        { duration: 300, fill: "forwards", easing: "cubic-bezier(0,.07,.75,-0.21)" }
    );
}
onMounted(() => {
    updatePointerPosition(false);
});
</script>

<style scoped>
.pointer {
    background-image: var(--light-white-gradient);
}
</style>
