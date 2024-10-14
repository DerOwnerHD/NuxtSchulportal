<template>
    <div class="h-full">
        <AppErrorDisplay :id="AppID.Moodle" v-if="hasAppError(AppID.Moodle)"></AppErrorDisplay>
        <div v-else-if="credentials" class="w-screen max-w-screen p-5">
            <div class="blurred-background p-4 rounded-xl max-w-full grid gap-2 overflow-x-hidden">
                <div class="flex justify-between items-center">
                    <h2>Deine Kurse</h2>
                    <FluidSelection
                        :options="coursesClassificationOptions"
                        :show-selected="true"
                        @update="(id) => switchCourseType(id as MoodleCoursesListClassification)"></FluidSelection>
                </div>
                <AppErrorDisplay :inlined="true" :id="AppID.MoodleCourseList" v-if="hasAppError(AppID.MoodleCourseList)"></AppErrorDisplay>
                <div class="grid gap-2 w-full max-w-full" v-else-if="coursesForClassification">
                    <template v-for="(course, index) of coursesForClassification">
                        <div v-if="index < MINIMAL_COURSE_COUNT || isShowingAllCourses" class="course-item grid grid-cols-subgrid gap-2 min-w-0">
                            <div class="course-image h-14 rounded-lg" :style="{ '--background': `url(${proxyMoodleImage(course.image)})` }"></div>
                            <span class="whitespace-nowrap text-ellipsis overflow-hidden">{{ course.names.short }}</span>
                        </div>
                    </template>
                    <ButtonDefault
                        v-if="coursesForClassification.length > MINIMAL_COURSE_COUNT && !isShowingAllCourses"
                        @click="isShowingAllCourses = true"
                        :icon="['fas', 'ellipsis']"
                        >Weitere Kurse anzeigen</ButtonDefault
                    >
                    <p v-if="!coursesForClassification.length" class="text-center">Keine Kurse</p>
                </div>
                <div class="grid place-content-center" v-else>
                    <InfiniteSpinner :size="30"></InfiniteSpinner>
                </div>
            </div>
        </div>
        <FullPageSpinner v-else></FullPageSpinner>
    </div>
</template>
<script setup lang="ts">
import type { FluidSelectionOption } from "~/common/component-props";
import type { MoodleCoursesListClassification } from "~/common/moodle";

const credentials = useMoodleCredentials();

const courses = useMoodleCourses();
const selectedClassification = ref<MoodleCoursesListClassification>("all");
const coursesForClassification = computed(() => courses.value.get(selectedClassification.value));
onMounted(() => {
    fetchMoodleCourses();
});

const MINIMAL_COURSE_COUNT = 5;
const isShowingAllCourses = ref(false);

function switchCourseType(id: MoodleCoursesListClassification) {
    selectedClassification.value = id;
    fetchMoodleCourses(id, false);
    isShowingAllCourses.value = false;
}

interface CourseClassificationOption extends FluidSelectionOption {
    id: MoodleCoursesListClassification;
}

const coursesClassificationOptions: CourseClassificationOption[] = [
    { title: "Alle", id: "all", default: true },
    { title: "Laufende", id: "inprogress" },
    { title: "Zukünftige", id: "future" },
    { title: "Vergangene", id: "past" },
    { title: "Favoriten", id: "favourites" },
    { title: "Versteckt", id: "hidden" }
];
</script>

<style scoped>
.course-item {
    grid-template-columns: 5rem auto;
}
.course-image {
    @apply bg-center bg-cover;
    background-image: var(--background);
}
</style>
