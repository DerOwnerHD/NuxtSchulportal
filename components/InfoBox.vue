<template>
    <div class="info-box rounded-md mx-4 p-2 flex gap-2 items-center !bg-opacity-30">
        <slot />
    </div>
</template>

<style scoped>
.info-box {
    border-style: solid;
    border-width: 2px;
}
.info-box[type="error"] {
    @apply border-red-500 bg-red-500;
}
.info-box[type="warning"] {
    @apply border-yellow-500 bg-yellow-500;
}
</style>
