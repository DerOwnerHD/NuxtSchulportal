<template>
    <div>
        <CardList></CardList>
    </div>
</template>

<script setup lang="ts">

useState("cards", () => [
    { id: "vplan", gradient: "linear-gradient(270deg, #168647 0, #24df62 70%)", icon: ["fas", "book"], name: "Vertretungsplan", index: 0 },
    { id: "splan", gradient: "linear-gradient(270deg, #008eff 0, #05e7ec 74%)", icon: ["fas", "hourglass-half"], name: "Stundenplan", index: 1 },
    { id: "moodle", gradient: "linear-gradient(315deg, #ff4e00 0, #ec9f05 74%)", icon: ["fas", "cloud"], name: "SchulMoodle", index: 2 },
    {
        id: "messages",
        gradient: "linear-gradient(270deg, #e14646 0, #fd6c2d 70%)",
        icon: ["fas", "envelope-open-text"],
        name: "Direktnachrichten",
        index: 3
    },
    { id: "calendar", gradient: "linear-gradient(315deg,#86163e 0,#df243a 70%)", icon: ["fas", "calendar-days"], name: "Kalender" },
    { id: "lessons", gradient: "linear-gradient(90deg, #6a61f8 0%, #4f49d1 100%)", icon: ["fas", "address-book"], name: "Mein Unterricht", index: 4 }
]);
</script>
