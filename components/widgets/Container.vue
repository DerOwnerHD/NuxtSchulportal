<template>
    <div class="grid container w-screen p-4 gap-4">
        <WidgetsSplanToday></WidgetsSplanToday>
        <WidgetsSplanToday></WidgetsSplanToday>
    </div>
</template>

<style scoped>
.container {
    grid-template-rows: 1fr 1fr 1fr;
    grid-template-columns: 1fr 1fr;
}
</style>
