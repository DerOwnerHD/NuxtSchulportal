<template>
    <span>
        <slot />
    </span>
</template>

<style scoped>
span {
    text-wrap: balance;
    hyphens: auto;
    -webkit-hyphens: auto;
    -moz-hyphens: auto;
    -ms-hyphens: auto;
    overflow-wrap: anywhere;
}
</style>
