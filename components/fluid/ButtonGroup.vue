<template>
    <div class="button-group flex justify-center items-center gap-2">
        <slot />
    </div>
</template>
y

<style scoped>
.button-group {
    > *:not(:first-child)::before {
        @apply mx-2 p-0 w-1 h-8 border-solid bg-gray-500 rounded-full content-empty;
    }
}
</style>
