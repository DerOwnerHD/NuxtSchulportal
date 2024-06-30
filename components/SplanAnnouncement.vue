<template>
    <div class="blurred-background m-2 rounded-2xl py-2 px-4 grid gap-2" v-if="announcement">
        <div class="flex gap-2 items-center">
            <font-awesome-icon :icon="['fas', 'circle-exclamation']"></font-awesome-icon>
            <span>{{ announcement.announced ? "Neuer aktiver Stundenplan" : "Unangekündigte Planänderung" }}</span>
        </div>
        <TimelineItem v-for="day of announcement.days">
            <div class="grid">
                <span class="font-bold text-xl">{{ day.day }}</span>
                <div class="lesson grid" :compare-type="lesson.type" v-for="lesson of day.differences">
                    <span class="text-gray-400 text-sm">{{ formatLessonArray(lesson.lessons, "") }}</span>
                    <div
                        :compare-type="subject.type"
                        class="subject flex gap-1 items-center whitespace-nowrap text-xs my-0.5"
                        v-for="subject of lesson.subjects">
                        <span class="font-bold text-base">{{ subject.data.name }}</span>
                        <div class="flex gap-0.5 items-center" v-if="subject.type === 'updated' && subject.updates && subject.updates.has('room')">
                            <div class="update-old">{{ subject.updates.get("room")?.at(1) }}</div>
                            <font-awesome-icon :icon="['fas', 'long-arrow-right']"></font-awesome-icon>
                            <div class="update-new">{{ subject.updates.get("room")?.at(0) }}</div>
                        </div>
                        <span v-else>
                            {{ subject.data.room }}
                        </span>
                        <div class="flex gap-0.5 items-center" v-if="subject.type === 'updated' && subject.updates && subject.updates.has('teacher')">
                            <div class="update-old">{{ subject.updates.get("teacher")?.at(1) }}</div>
                            <font-awesome-icon :icon="['fas', 'long-arrow-right']"></font-awesome-icon>
                            <div class="update-new">{{ subject.updates.get("teacher")?.at(0) }}</div>
                        </div>
                        <span v-else>
                            {{ subject.data.teacher }}
                        </span>
                    </div>
                </div>
            </div>
        </TimelineItem>
        <p>
            Gültig seit <span class="font-bold">{{ relativeOrAbsoluteDateFormat(announcement.start_date, "day-month-full", true) }}</span>
        </p>
        <ButtonDefault @click="markSplanAnnouncementAsRead" class="w-fit" :icon="['fas', 'check']">Verstanden</ButtonDefault>
    </div>
</template>

<script setup lang="ts">
const announcement = useSplanAnnouncement();
</script>

<style scoped>
.subject[compare-type="removed"],
.update-old,
.lesson[compare-type="removed"] {
    @apply border-red-500 bg-red-500 line-through;
}
.subject[compare-type="new"],
.update-new,
.lesson[compare-type="added"] {
    @apply border-lime-500 bg-lime-500;
}
.subject[compare-type="removed"],
.subject[compare-type="new"],
.update-old,
.update-new,
.lesson[compare-type="removed"],
.lesson[compare-type="added"] {
    @apply bg-opacity-30 border-solid border-2 rounded-md p-0.5 w-fit;
}
.subject::before {
    @apply text-xl mx-1;
}
.subject[compare-type="new"]::before {
    content: "+";
}
.subject[compare-type="removed"]::before {
    content: "-";
}
</style>
