<template>
    <div>
        <AppHeader text="Vertretungsplan" icon="icons/vplan.svg" :flyout="flyout"></AppHeader>
    </div>
</template>

<script setup lang="ts">
const flyout = useVertretungsplanFlyout();
</script>
