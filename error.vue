<template>
    <div class="h-fit min-h-[100vh] overflow-y-auto py-2">
        <ErrorDisplay :error="error" :buttons="buttons"></ErrorDisplay>
    </div>
</template>

<script setup lang="ts">
const buttons = [
    [
        { icon: ["fas", "home"], action: () => navigateTo("/") },
        { icon: ["fas", "arrow-right-from-bracket"], action: logOff }
    ]
];
const error = useError();
</script>
