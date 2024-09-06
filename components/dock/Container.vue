<template>
    <div class="dock-gradient w-screen h-24 fixed bottom-0 left-0 z-[100] pointer-events-none"></div>
    <div class="dock flex justify-evenly mx-4 p-4 rounded-2xl gap-6 blurred-background shadow-lg z-[101] relative backdrop-blur-md">
        <DockItem :id="AppID.Vertretungsplan" name="Vertretungsplan" :flyout="useVertretungsplanFlyout()" route="/vertretungsplan">
            <NuxtImg class="h-16" src="icons/vplan.svg"></NuxtImg>
        </DockItem>
        <DockItem :id="AppID.Stundenplan" name="Stundenplan" :flyout="useStundenplanFlyout()" route="/stundenplan">
            <NuxtImg class="h-16" src="icons/splan.svg"></NuxtImg>
        </DockItem>
        <DockItem :id="AppID.Moodle" name="SchoolMoodle" :flyout="moodleFlyout" route="/moodle">
            <NuxtImg class="h-16" src="icons/moodle.svg"></NuxtImg>
        </DockItem>
        <DockItem :id="AppID.MyLessons" name="Mein Unterricht" :flyout="useMyLessonsFlyout()" route="/mylessons">
            <NuxtImg class="h-16" src="icons/mylessons.svg"></NuxtImg>
        </DockItem>
    </div>
</template>

<script setup lang="ts">
const moodleFlyout: any[] = [];
</script>

<style scoped>
img {
    pointer-events: none;
}
.dock-gradient {
    background: linear-gradient(to top, #000000a0, transparent);
}
</style>
