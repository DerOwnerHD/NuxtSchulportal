<template>
    <div class="deck-card w-72 min-w-72 max-w-72 p-5 rounded-2xl mx-auto left-0 right-0 min-h-0 overflow-x-clip overflow-y-scroll">
        <slot />
    </div>
</template>

<style scoped>
.deck-card {
    border-top: var(--small-white-border);
}
</style>
