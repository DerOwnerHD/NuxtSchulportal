<template v-if="">
    <ErrorDisplay :retry-function="value.retry_function" :error="map.get(id)?.error" v-if="value"></ErrorDisplay>
</template>

<script setup lang="ts">
import type { AnyFunction } from "~/common";

const props = defineProps<{ id: AppID }>();
const map = useAppErrors();
const value = computed(() => map.value.get(props.id));
</script>
