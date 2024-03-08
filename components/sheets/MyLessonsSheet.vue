<template>
    <div>
        <h1 class="px-5 text-xl">
            {{ course.subject }}
            <br /><span class="font-normal text-sm text-center whitespace-nowrap flex justify-center">
                <span>bei</span>
                <img :src="image" class="h-5 rounded-full mx-1" />
                <span>
                    {{ course.teacher.full }}
                </span>
            </span>
        </h1>
        <div class="splitter"></div>
        <div id="last-lesson" class="relative" v-if="lesson && hasInvidiualLessonOpen">
            <p class="flex items-center justify-center">
                <font-awesome-icon
                    :icon="['fas', 'list']"
                    class="rounded-button !p-2 mx-2"
                    @click="hasInvidiualLessonOpen = false"></font-awesome-icon>
                <span header-alike>{{ selectedLesson === null ? "Letzte " : "" }}Stunde</span>
                <span class="ml-1"> am {{ parseDate(lesson.date) }}</span>
                <span class="small-info place-content-center grid">anwesend</span>
            </p>
            <p v-html="lesson.topic"></p>
            <div class="grid place-content-center">
                <div class="basic-error my-2 grid" v-if="lesson.homework">
                    <div class="flex justify-self-center text-xl items-center">
                        <font-awesome-icon :icon="['fas', 'pen-to-square']"></font-awesome-icon>
                        <span class="ml-1">Hausaufgaben unerledigt</span>
                    </div>
                    <p v-html="lesson.homework.description"></p>
                    <button class="button-with-symbol mb-1 w-fit justify-self-center">
                        <font-awesome-icon :icon="['fas', 'check']"></font-awesome-icon>
                        <span>Als erledigt markieren</span>
                    </button>
                </div>
            </div>
        </div>
        <div id="lesson-list" v-else-if="!hasInvidiualLessonOpen" class="grid place-content-center text-center">
            <p header-alike>Alle Stunden im {{ semester }}. Halbjahr</p>
            <ul v-if="selectedSemester.lessons">
                <li v-for="lesson of selectedSemester.lessons">
                    <div class="whitespace-nowrap">
                        <span header-alike>{{ lesson.topic }}</span>
                        <span class="ml-1"
                            >am <b>{{ parseDate(lesson.date) }}</b></span
                        >
                    </div>
                    <div class="flex">
                        <div class="basic-info">{{ lesson.downloads.files.length }} Download(s)</div>
                        <div class="basic-info-colored" style="--color: rgb(245, 158, 11); --bg-color: rgb(245, 158, 11, 0.3)">
                            {{ lesson.uploads.length }} Uploads
                        </div>
                    </div>
                </li>
            </ul>
            <div v-else class="spinner justify-self-center my-2" style="--size: 2rem"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
const CURRENT_SEMESTER = parseInt(useRuntimeConfig().public.currentSemester as string);
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

const hasInvidiualLessonOpen = ref(true);
const semester = ref(CURRENT_SEMESTER);
const semesters = ref<{ [key: number]: MyLessonsSemester }>({});
const selectedSemester = computed(() => semesters.value[semester.value] ?? []);
const lesson = computed(() => (selectedLesson.value !== null ? selectedSemester.value.lessons.at(selectedLesson.value) : course.value.last_lesson));
const selectedLesson = ref<number | null>(null);

const image = useState<string>("selected-mylessons-course-image");
const course = useSelectedMyLessonsCourse();

function parseDate(text: string | null = "") {
    if (typeof text !== "string") return "<unbekannt>";
    const date = new Date(text);
    if (date.toDateString() === "Invalid Date") return "<unbekannt>";
    return `${addZeroToNumber(date.getDate())}. ${MONTHS[date.getMonth()]}.`;
}

async function fetchSemesterData() {
    // No need to refetch the data if it already exists
    if (semesters.value[semester.value]) return;
    const data = await $fetch<MyLessonsSemester>("/api/mylessons/course", {
        query: {
            token: useToken().value,
            session: useSession().value,
            key: await useAESKey(),
            semester: semester.value,
            id: course.value.id
        }
    });
    semesters.value[semester.value] = data;
}
watch(semester, fetchSemesterData);

onMounted(() => {
    if (!course.value) return;
    fetchSemesterData();
});
</script>

<style scoped>
h1 {
    font-family: "Merriweather", sans-serif;
}
.splitter {
    width: 80%;
    margin: 10px 10%;
    background: linear-gradient(90deg, transparent 0%, #ffffff 50%, transparent 100%);
    height: 1px;
}
#lesson-list {
    ul {
        @apply px-5 w-screen text-left;
    }
}
</style>
