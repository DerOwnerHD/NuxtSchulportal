<template>
    <div>
        <div v-if="course">
            {{ course.subject }}
        </div>
    </div>
</template>

<script setup lang="ts">
const courses = useMyLessonsCourses();
const route = useRoute();
const course = computed(() => {
    if (!courses.value) return null;
    return courses.value.courses.find((x) => x.id === parseInt(route.params.id));
});
</script>
