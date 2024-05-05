<template>
    <WidgetsWidget class="aspect-square overflow-y-auto" :background="BACKGROUND">
        <div class="grid w-full lessons gap-x-2 overflow-x-clip text-ellipsis relative">
            <div class="absolute h-full left-1 track"></div>
            <span></span>
            <span class="lesson above-2">1-2</span>
            <span class="classes above-2">a</span>
            <span></span>
            <span class="lesson above-1">3-4</span>
            <span class="classes above-1">b</span>
            <span>
                <font-awesome-icon class="drop-shadow" :icon="['fas', 'caret-right']"></font-awesome-icon>
            </span>
            <span class="lesson">5</span>
            <span class="classes">c</span>
            <span></span>
            <span class="lesson below-1">6</span>
            <span class="classes below-1">d</span>
            <span></span>
            <span class="lesson below-2">7</span>
            <span class="classes below-2">-</span>
            <span></span>
            <span class="lesson far">8-9</span>
            <span class="classes far">e</span>
        </div>
    </WidgetsWidget>
</template>

<script setup lang="ts">
const BACKGROUND = "linear-gradient(to bottom, #057ff3, #0451eb)";
</script>

<style scoped>
span {
    @apply overflow-clip whitespace-nowrap bg-clip-text bg-white;
    background-clip: text !important;
    -webkit-text-fill-color: transparent;
}
span.below-1 {
    background: linear-gradient(to bottom, #ffffff, #ffffffa0);
}
span.below-2 {
    background: linear-gradient(to bottom, #ffffffa0, #ffffff50);
}
span.far {
    background: #ffffff50;
}
span.above-1 {
    background: linear-gradient(to top, #ffffff, #ffffffa0);
}
span.above-2 {
    background: linear-gradient(to top, #ffffffa0, #ffffff50);
}
h1 {
    font-family: "Days One", serif;
}
.lessons {
    grid-template-columns: 1fr 3fr 6fr;
}
.lesson {
    @apply text-center;
    font-family: "Days One", serif;
}
.track {
    border-image: linear-gradient(#ffffff20, #ffffff, #ffffff50) 1;
    border-left: dashed medium white;
}
</style>
