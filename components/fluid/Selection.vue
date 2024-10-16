<template>
    <div class="flex items-center" ref="container">
        <div class="flex gap-2 items-center hover:active:scale-95 hover:active:opacity-90 transition-all" @click="open">
            <span class="bg-gray-500 rounded-full min-w-5 text-center px-1" v-if="showAmount">{{ options.length }}</span>
            <span>{{ showSelected ? (selectedOption?.title ?? "") : (text ?? "Auswahl") }}</span>
            <div class="grid text-xs">
                <font-awesome-icon :icon="['fas', 'chevron-up']"></font-awesome-icon>
                <font-awesome-icon :icon="['fas', 'chevron-down']"></font-awesome-icon>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { FluidSelectionOption } from "~/common/component-props";

const emit = defineEmits<{
    update: [id: string];
}>();
const element = useTemplateRef<HTMLElement>("container");
const isOpen = ref(false);
async function open() {
    if (!element.value || isOpen.value) return;
    const metadata = await createFlyout(
        {
            groups: [
                {
                    items: props.options.map((option, index) => {
                        return {
                            title: option.title,
                            text: option.subtitle,
                            icon: index === selected.value ? ["fas", "check"] : undefined,
                            disabled: index === selected.value,
                            action: () => selectOption(index)
                        };
                    })
                }
            ]
        },
        element.value
    );
    if (!metadata) return;
    metadata.addCloseListener(() => (isOpen.value = false));
    isOpen.value = true;
}
const props = defineProps<{
    options: FluidSelectionOption[];
    showSelected?: boolean;
    showAmount?: boolean;
    text?: string;
}>();
function selectOption(index: number) {
    selected.value = index;
    emit("update", props.options[index].id);
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
