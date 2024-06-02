<template>
    <div class="fluid-selection flex items-center" :selection-id="id">
        <div class="flex gap-2 items-center hover:active:scale-95 hover:active:opacity-90 transition-all" @click="open">
            <span class="bg-gray-500 rounded-full min-w-5 text-center px-1" v-if="showAmount">{{ options.length }}</span>
            <span>{{ showSelected ? selectedOption?.title ?? "" : text ?? "Auswahl" }}</span>
            <div class="grid text-xs">
                <font-awesome-icon :icon="['fas', 'chevron-up']"></font-awesome-icon>
                <font-awesome-icon :icon="['fas', 'chevron-down']"></font-awesome-icon>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
    update: [index: number];
}>();
const flyout = useFlyout();
function open() {
    const element = document.querySelector(`.fluid-selection[selection-id="${props.id}"]`);
    if (element === null) return console.error("Failed to open selection flyout");
    const dimensions = element.getBoundingClientRect();
    flyout.value = {
        position: [dimensions.left, dimensions.top + dimensions.height + 8],
        groups: [
            props.options.map((option, index) => {
                return {
                    title: option.title,
                    text: option.subtitle,
                    icon: index === selected.value ? ["fas", "check"] : undefined,
                    disabled: index === selected.value,
                    action: () => selectOption(index)
                };
            })
        ],
        id: props.id
    };
}
const props = defineProps<{
    id: string;
    options: { title: string; id: string; subtitle?: string; default?: boolean }[];
    showSelected?: boolean;
    showAmount?: boolean;
    text?: string;
}>();
function selectOption(index: number) {
    selected.value = index;
    emit("update", index);
}
onMounted(findDefaultOption);
// The default value might be changed (i.e. the splan recomputing the default plan based on plan parameter)
watch(props, findDefaultOption);

function findDefaultOption() {
    const defaultOption = props.options.findIndex((option) => option.default);
    if (defaultOption === -1) return;
    selected.value = defaultOption;
}

const selected = ref(0);
const selectedOption = computed(() => props.options[selected.value]);
</script>
