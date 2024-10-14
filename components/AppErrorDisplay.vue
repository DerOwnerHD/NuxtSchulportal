<template>
    <ErrorDisplay :error="value" v-if="value" :inlined="inlined"></ErrorDisplay>
</template>

<script setup lang="ts">
const props = defineProps<{ id: AppID; inlined?: boolean }>();
const map = useAppErrors();
const value = computed(() => map.value.get(props.id));
</script>
