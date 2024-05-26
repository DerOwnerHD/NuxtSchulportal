<template>
    <div class="deck-card blurred-background w-72 p-5 rounded-2xl mx-auto left-0 right-0 h-full max-h-full overflow-x-clip overflow-y-scroll">
        <slot />
    </div>
</template>

<style scoped>
.deck-card {
    border-top: var(--small-white-border);
}
</style>
