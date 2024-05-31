<template>
    <div class="content grid place-content-center text-center justify-items-center gap-4 w-full" v-if="lesson">
        <h2 class="text-center">
            <PrettyWrap>
                {{ lesson.topic }}
            </PrettyWrap>
        </h2>
        <div class="flex gap-2 flex-wrap justify-center w-full">
            <div class="widget blurred-background">{{ relativeOrAbsoluteDateFormat(lesson.date ?? "", "day-month-short") }}</div>
            <div class="widget blurred-background" v-if="lesson.attendance?.length">{{ lesson.attendance }}</div>
        </div>
        <section class="homework" v-if="lesson.homework">
            <header class="flex justify-between">
                <div class="flex gap-1 items-center">
                    <font-awesome-icon :icon="['fas', 'pen-to-square']"></font-awesome-icon>
                    <span>Hausaufgaben</span>
                </div>
                <ButtonDefault :icon="['fas', 'check']" v-if="!lesson.homework.done" @click="markHomeworkAsDone">erledigt</ButtonDefault>
                <span v-else>🥳 erledigt</span>
            </header>
            <div class="text-left" v-html="lesson.homework.description"></div>
        </section>
        <section class="downloads" v-if="lesson.downloads.files.length">
            <header class="flex justify-between">
                <div class="flex gap-1 items-center">
                    <font-awesome-icon :icon="['fas', 'download']"></font-awesome-icon>
                    <span>Downloads</span>
                </div>
                <ButtonDefault @click="openLink(SPH_BASE + '/' + lesson?.downloads.link)">Alle Dateien</ButtonDefault>
            </header>
            <div class="grid gap-1 w-full">
                <div class="file" v-for="file of lesson.downloads.files">
                    <span></span>
                    <span>
                        {{ file.name }}
                        <span class="text-xs">{{ file.size }}</span>
                    </span>
                </div>
            </div>
        </section>
        <section class="uploads" v-if="lesson.uploads.length">
            <header class="flex items-center gap-1">
                <font-awesome-icon :icon="['fas', 'download']"></font-awesome-icon>
                <span>Abgaben</span>
            </header>
            <div class="grid gap-2 mt-2">
                <div class="upload rounded-md grid text-left p-2" v-for="upload of lesson.uploads">
                    <div class="flex items-center gap-2">
                        <span class="font-bold">
                            {{ upload.name }}
                        </span>
                        <span class="widget !bg-red-500" v-if="!upload.uploadable">abgelaufen</span>
                    </div>
                    <div class="grid w-full" v-if="upload.files.length">
                        <div class="file text-xs" v-for="file of upload.files">
                            <span></span>
                            <span>
                                {{ file.name }}
                            </span>
                        </div>
                    </div>
                    <span v-else>Keine Dateien abgegeben</span>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ lesson: MyLessonsLesson | null; course: number }>();
async function markHomeworkAsDone() {
    if (!props.lesson?.homework) return;
    const response = await $fetch("/api/mylessons/homework", {
        method: "POST",
        query: {
            token: useToken().value
        },
        body: {
            action: "done",
            id: props.course,
            lesson: props.lesson?.entry
        }
    });
    if (response.error) return;
    props.lesson.homework.done = true;
}
</script>

<style scoped>
.content {
    grid-template-columns: 1fr;
}
.file {
    @apply grid w-full overflow-hidden whitespace-nowrap;
    grid-template-columns: min-content 1fr;
}
section {
    background: linear-gradient(to bottom, #3a1d24, transparent);
    @apply rounded-lg p-2 w-full;
}
.upload {
    border: solid 2px white;
}
</style>
