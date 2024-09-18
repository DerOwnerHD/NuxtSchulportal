<template>
    <div class="flex items-center">
        <div class="flex items-center relative" ref="container">
            <div
                v-for="(option, index) of options"
                @click="switchSelection(index)"
                :index="index"
                class="option flex gap-2 rounded-full px-4 py-1 items-center"
                :class="{ selected: selected === index, 'hover:active:scale-95 hover:active:opacity-90': selected !== index }">
                <div class="px-2 rounded-full bg-gray-500 h-fit" v-if="option.widget">{{ option.widget }}</div>
                <font-awesome-icon v-if="option.icon" :icon="option.icon"></font-awesome-icon>
                <div class="text-center">
                    <h1>{{ option.title }}</h1>
                    <p class="text-sm leading-4">{{ option.subtitle }}</p>
                </div>
            </div>
            <div class="selector h-full right-0 absolute rounded-full opacity-0" ref="selector"></div>
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
    updateSelectorPosition();
}
const selector = useTemplateRef("selector");
const container = useTemplateRef("container");
function updateSelectorPosition(animate: boolean = true) {
    if (!selector.value || !container.value) return;
    const element = container.value.querySelector<HTMLElement>(`.option[index="${selected.value}"]`);
    if (element === null) return;
    const { offsetLeft, clientWidth } = element;
    if (!animate) {
        selector.value.style.left = offsetLeft + "px";
        selector.value.style.width = clientWidth + "px";
        selector.value.animate({ opacity: "1" }, { duration: 150, fill: "forwards" });
        return;
    }
    selector.value.animate(
        {
            left: offsetLeft + "px",
            width: clientWidth + "px"
        },
        { duration: 300, fill: "forwards", easing: "cubic-bezier(0,.07,.75,-0.21)" }
    );
}
onMounted(() => {
    updateSelectorPosition(false);
});
</script>

<style scoped>
.selector {
    background-image: var(--light-white-gradient);
}
</style>
