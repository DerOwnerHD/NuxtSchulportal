<template>
    <div class="timeline-item flex">
        <div class="timeline-bar bg-white ml-2 mr-4 rounded-b-sm w-1 h-full grid justify-center relative"></div>
        <div class="wrapper">
            <slot />
        </div>
    </div>
</template>

<style scoped>
.timeline-item .timeline-bar::before {
    @apply content-empty rounded-full top-0 w-4 h-4 bg-white;
}
</style>
