<template>
    <main v-if="cardsOpen.includes('lessons')">
        <div class="mb-2 relative rounded-2xl w-[90%] mx-[5%] z-0 gradient-border max-w-[18rem] text-white">
            <div class="grid place-content-center py-2" v-if="!courses || typeof courses === 'string' || !courses.courses">
                <div class="error" v-if="appErrors.mylessons">
                    <span>{{ appErrors.mylessons }}</span>
                </div>
                <ul class="placeholder" v-else>
                    <li v-for="n in 4"></li>
                </ul>
            </div>
            <p v-else-if="!courses.courses.length" class="text-center py-1">Keine Kurse</p>
            <ul class="py-2" v-else>
                <li v-for="course of courses.courses">
                    <div class="title">
                        <ClientOnly>
                            <font-awesome-icon class="mr-1.5" :icon="['fas', 'book']"></font-awesome-icon>
                        </ClientOnly>
                        <h1>{{ course.subject }}</h1>
                        <small> bei {{ course.teacher.short }}</small>
                    </div>
                    <div class="last-lesson" v-if="course.last_lesson">
                        <small>
                            {{ course.last_lesson.topic }}
                        </small>
                    </div>
                </li>
            </ul>
        </div>
    </main>
    <footer>
        <button @click="openLink('https://start.schulportal.hessen.de/meinunterricht.php')">
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'up-right-from-square']"></font-awesome-icon>
            </ClientOnly>
            <span>Öffnen</span>
        </button>
    </footer>
</template>

<script lang="ts">
export default defineComponent({
    name: "Lessons",
    data() {
        return {
            cardsOpen: useState<Array<string>>("cards-open"),
            appErrors: useAppErrors(),
            courses: useState<MyLessonsAllCourses>("mylessons")
        };
    },
    computed: {},
    methods: {}
});
</script>

<style scoped>
.placeholder li {
    @apply h-4 w-48 rounded-full my-1.5;
}
li {
    @apply text-sm w-full overflow-hidden text-ellipsis px-3 py-1;
    .title {
        @apply whitespace-nowrap;
        h1 {
            @apply max-w-[10rem] overflow-hidden text-ellipsis inline-flex;
        }
    }
}
ul:not(.placeholder) li:not(:last-child) {
    border-bottom: solid 1px;
    border-image: linear-gradient(to left, transparent 10%, #ffffff 50%, transparent 90%) 1;
}
</style>
