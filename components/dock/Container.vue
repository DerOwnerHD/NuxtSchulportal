<template>
    <div class="dock-gradient w-screen h-24 fixed bottom-0 left-0 z-[100]"></div>
    <div class="dock flex justify-evenly mx-4 p-4 rounded-2xl gap-6 blurred-background shadow-lg z-[101] relative backdrop-blur-md">
        <DockItem
            id="vertretungsplan"
            name="Vertretungsplan"
            subtitle="Vor 5 Minuten aktualisiert"
            :flyout="useVertretungsplanFlyout()"
            route="/vertretungsplan">
            <NuxtImg class="h-16" src="icons/vplan.svg"></NuxtImg>
        </DockItem>
        <DockItem
            id="stundenplan"
            name="Stundenplan"
            subtitle="Gültig vom 30. August bis 05. Dezember"
            :flyout="stundenplanFlyout"
            route="/stundenplan">
            <NuxtImg class="h-16" src="icons/splan.svg"></NuxtImg>
        </DockItem>
        <DockItem id="moodle" name="SchoolMoodle" subtitle="35 Kurse - davon 7 abgelaufen" :flyout="moodleFlyout" route="/moodle">
            <NuxtImg class="h-16" src="icons/moodle.svg"></NuxtImg>
        </DockItem>
        <DockItem id="mylessons" name="Mein Unterricht" subtitle="7 Kurse" :flyout="useMyLessonsFlyout()" route="/mylessons">
            <NuxtImg class="h-16" src="icons/mylessons.svg"></NuxtImg>
        </DockItem>
    </div>
</template>

<script setup lang="ts">
import { useMyLessonsFlyout } from "~/composables/mylessons";

const stundenplanFlyout = [[{ title: "Vergleichen", icon: ["fas", "code-compare"] }]];
const moodleFlyout: any[] = [];
const myLessonsFlyout = [[{ title: "Geheime Daten ausblenden", icon: ["fas", "key"] }]];
</script>

<style scoped>
img {
    pointer-events: none;
}
.dock-gradient {
    background: linear-gradient(to top, #000000a0, transparent);
}
</style>
