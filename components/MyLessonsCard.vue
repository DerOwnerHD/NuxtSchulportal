<template>
    <div class="card-content grid text-center h-full min-h-full relative" v-if="lesson">
        <main class="grid gap-4 w-full mb-2 h-fit p-4">
            <h2 class="text-center">
                <PrettyWrap>
                    {{ lesson.topic }}
                </PrettyWrap>
            </h2>
            <div class="flex gap-2 flex-wrap justify-center w-full">
                <div class="widget blurred-background">{{ relativeOrAbsoluteDateFormat(lesson.date ?? "", "day-month-short") }}</div>
                <div class="widget blurred-background" v-if="lesson.lessons?.length">{{ joinLessonList(lesson.lessons) }}</div>
                <div class="widget blurred-background" v-if="lesson.attendance?.length">{{ lesson.attendance }}</div>
            </div>
            <p class="text-start" v-if="lesson.description" v-html="lesson.description"></p>
        </main>
        <div class="bottom-container sticky bottom-0 w-full max-h-52 overflow-y-scroll shadow-lg">
            <div :class="{ hidden: !lesson.homework }">
                <ExpandableSection
                    :name="lesson.entry"
                    id="homework"
                    :data-undone="!lesson.homework?.done ? '' : null"
                    :icon="['fas', 'book']"
                    title="Hausaufgaben">
                    <div class="grid gap-2">
                        <p v-html="lesson.homework?.description"></p>
                        <ButtonDefault @click="toggleHomework" :icon="['fas', lesson.homework?.done ? 'xmark' : 'check']"
                            >Als {{ lesson.homework?.done ? "unerledigt" : "erledigt" }} markieren</ButtonDefault
                        >
                    </div>
                </ExpandableSection>
                <div class="widget pointer-events-none absolute bg-red-500 top-2.5 right-2 rounded-full shadow-sm" v-if="!lesson.homework?.done">
                    unerledigt
                </div>
            </div>
            <ExpandableSection
                :name="lesson.entry"
                id="downloads"
                :class="{ hidden: !lesson.downloads.link }"
                :icon="['fas', 'download']"
                :title="`Downloads (${lesson.downloads.files.length})`"
                class="overflow-x-hidden">
                <div class="grid w-full" v-if="lesson.downloads.files.length">
                    <div
                        v-for="file of lesson.downloads.files"
                        class="min-w-0 overflow-hidden flex gap-2 p-2 !bg-opacity-30 hover:active:scale-95 hover:active:bg-white transition-all rounded-lg items-center"
                        @click="openFileDownload(file.name)">
                        <font-awesome-icon :icon="['fas', file.extension ? findIconForFileType(file.extension) : 'file']"></font-awesome-icon>
                        <div class="leading-4">
                            <p class="whitespace-nowrap">{{ file.name }}</p>
                            <small>{{ file.size }}</small>
                        </div>
                    </div>
                </div>
                <p v-else>Keine Dateien</p>
            </ExpandableSection>
            <ExpandableSection
                :name="lesson.entry"
                id="uploads"
                :class="{ hidden: !lesson.uploads.length }"
                :icon="['fas', 'upload']"
                title="Abgaben">
            </ExpandableSection>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Nullable } from "~/common";
import type { MyLessonsLesson } from "~/common/mylessons";

async function openFileDownload(name: Nullable<string>) {
    if (!name || typeof props.course !== "number" || !props.lesson) return;
    const link = generateSSOLink(
        `https://start.schulportal.hessen.de/meinunterricht.php?a=downloadFile&id=${props.course}&e=${props.lesson.entry}&f=${name}`
    );
    window.open(link, "_blank");
}
const props = defineProps<{ lesson: MyLessonsLesson | null; course: number }>();
async function toggleHomework() {
    if (!props.lesson?.homework) return;
    try {
        const response = await $fetch("/api/mylessons/homework", {
            method: "POST",
            query: {
                token: useToken().value
            },
            body: {
                action: props.lesson.homework.done ? "undone" : "done",
                id: props.course,
                lesson: props.lesson?.entry
            }
        });
        if (response.error) return;
        // If the user should reload the page, the homework would still be marked as undone.
        // For that, a full reauth appears to be needed...
        props.lesson.homework.done = !props.lesson.homework.done;
    } catch (error) {
        createAppError(AppID.MyLessonsCourse, error, () => clearAppError(AppID.MyLessonsCourse));
    }
}
</script>

<style scoped>
.card-content {
    grid-template-rows: 1fr min-content;
}
.file {
    @apply grid w-full overflow-hidden whitespace-nowrap;
    grid-template-columns: min-content 1fr;
}
details {
    @apply text-start relative py-2 px-4 border-t-2 border-white border-opacity-50;
}
details[open] {
    @apply !min-h-full h-full;
}
.bottom-container {
    background: #454450;
}
</style>
