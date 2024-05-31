<template>
    <div class="info-box rounded-md mx-4 p-2 flex gap-2 items-center">
        <slot />
    </div>
</template>

<style scoped>
.info-box {
    border-style: solid;
    border-width: 2px;
}
.info-box[type="error"] {
    @apply border-red-500 bg-red-500 bg-opacity-30;
}
</style>
