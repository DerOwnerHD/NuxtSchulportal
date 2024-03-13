<template>
    <div class="outer" :class="{ small }">
        <div class="inner">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
const { small } = defineProps<{ small?: boolean }>();
</script>

<style scoped>
.outer {
    @apply relative;
}
.outer::before {
    @apply absolute z-[1] left-[-3px] right-[-3px] top-[-3px] bottom-[-3px] block;
    border-radius: inherit;
    content: "";
    background: var(--gradient);
    box-shadow: 0px 0px 15px 2px rgba(0, 0, 0, 0.3);
}
.outer.small::before {
    @apply !left-[-1px] !right-[-1px] !top-[-1px] !bottom-[-1px];
}
.inner {
    position: relative;
    z-index: 2;
    background: var(--dark-gradient-background);
    border-radius: inherit;
}
</style>
