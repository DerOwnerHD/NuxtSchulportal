<template>
    <div class="flex flex-wrap gap-2 justify-center text-white">
        <div
            v-for="option of props.options"
            class="flex items-center rounded-lg gap-2 border-1 border-white px-2 py-1"
            :class="{ 'bg-white bg-opacity-30': selectedId === option.id }"
            @click="selectValue(option.id)">
            <font-awesome-icon v-if="option.icon" :icon="option.icon"></font-awesome-icon>
            <span>{{ option.text }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { LegacySelectBoxOption } from "~/common/component-props";

/**
 * TODO: This may or may not be retired when all pages (/login) using this may be switched to other designs.
 * For the time being, this is an implementation to get rid of old CSS junk.
 */

const props = defineProps<{ options: LegacySelectBoxOption[]; disabled?: boolean }>();
const emit = defineEmits<{ update: [id: string] }>();

const selectedId = ref<string | null>(null);
onServerPrefetch(() => (selectedId.value = findDefaultValueId()));
onMounted(() => (selectedId.value = findDefaultValueId()));

function selectValue(id: string) {
    if (selectedId.value === id || props.disabled) return;
    selectedId.value = id;
    emit("update", id);
}

function findDefaultValueId() {
    if (!props.options.length) return null;
    return props.options.find((option) => option.default)?.id ?? props.options[0].id;
}
</script>
