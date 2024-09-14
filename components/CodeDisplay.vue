<template>
    <pre
        class="blurred-background borderless font-mono dark rounded-xl text-left p-2 whitespace-pre-wrap hover:active:scale-90 transition-transform"
        v-html="code"></pre>
</template>

<script setup lang="ts">
const props = defineProps<{ data: any }>();
const code = computed(() => syntaxHighlight(props.data));
</script>

<style scoped>
pre {
    line-break: anywhere;
}
</style>
