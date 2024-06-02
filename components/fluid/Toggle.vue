<template>
    <button class="flex items-center">
        <div
            @click="updateToggle"
            class="h-full flex gap-2 items-center transition-all px-2"
            :class="{ 'hover:active:scale-95 hover:active:opacity-90': !disabled, 'opacity-30': disabled }">
            <font-awesome-icon v-if="icon" :icon="icon"></font-awesome-icon>
            <slot />
            <span
                class="border-solid border-2 border-white rounded-full aspect-square h-8 grid place-content-center"
                :class="{ 'bg-white text-black': state }">
                <font-awesome-icon :icon="['fas', 'check']"></font-awesome-icon>
            </span>
        </div>
    </button>
</template>

<script setup lang="ts">
const emit = defineEmits<{ update: [state: boolean] }>();
const props = defineProps<{ icon?: string[]; disabled?: boolean; state: boolean }>();
function updateToggle() {
    if (props.disabled) return;
    emit("update", !props.state);
}
</script>
