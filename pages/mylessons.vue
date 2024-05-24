<template>
    <div class="h-full">
        <ErrorDisplay :error="errors.get('mylessons')" v-if="errors.has('mylessons')"></ErrorDisplay>
        <div class="grid py-4 px-2" v-else-if="courses">
            <div class="item grid gap-2 rounded-md p-2" v-for="(course, index) of courses.courses">
                <div class="icon h-16 relative grid">
                    <NuxtImg class="h-full" src="icons/folder.svg"></NuxtImg>
                    <font-awesome-icon
                        v-if="icons[index]"
                        class="absolute justify-self-center drop-shadow-sm text-2xl top-7 opacity-70"
                        :icon="icons[index]"></font-awesome-icon>
                </div>
                <div class="description grid overflow-x-clip min-w-0">
                    <h1 class="">{{ course.subject }}</h1>
                    <div v-if="course.last_lesson" class="flex whitespace-nowrap gap-2">
                        <span class="px-2 bg-gray-500 rounded-full w-fit h-fit">{{
                            relativeOrAbsoluteDateFormat(course.last_lesson.date ?? "", "day-month-short")
                        }}</span>
                        <span>{{ course.last_lesson.topic }}</span>
                    </div>
                </div>
            </div>
        </div>
        <div v-else class="h-full w-screen grid place-content-center">
            <InfiniteSpinner :size="50"></InfiniteSpinner>
        </div>
    </div>
</template>

<script setup lang="ts">
const courses = useMyLessonsCourses();
const errors = useAppErrors();
const icons = computed(() => {
    if (!courses.value) return [];
    return courses.value.courses.map((course) => findIconForMyLessonsCourse(course.subject ?? ""));
});
</script>

<style scoped>
.item {
    grid-template-columns: auto 1fr;
    transition-property: background transform;
    transition-duration: 250ms;
}
.item:hover:active {
    transform: scale(98%);
    background: #ffffff30;
}
.description {
    grid-template:
        "a a a"
        "b b c";
    > *:nth-child(1) {
        grid-area: a;
    }
    > *:nth-child(2) {
        grid-area: b;
    }
    > *:nth-child(3) {
        grid-area: c;
    }
}
</style>
