<template>
    <div>
        <div class="sticky top-8 z-[5]" id="sheet-header">
            <h1 class="px-5 text-xl">
                {{ course.subject }}
                <br /><span class="font-normal text-sm text-center whitespace-nowrap flex justify-center">
                    <span>bei</span>
                    <img :src="image" class="h-5 rounded-full mx-1" />
                    <span>
                        {{ teacherName }}
                    </span>
                </span>
            </h1>
            <div class="splitter"></div>
        </div>
        <div id="sheet-inner-content">
            <div id="last-lesson" class="relative" v-if="lesson && hasInvidiualLessonOpen">
                <p class="flex items-center justify-center">
                    <font-awesome-icon :icon="['fas', 'list']" class="rounded-button !p-2 mx-2" @click="switchToLessonsList"></font-awesome-icon>
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
                <ul v-if="selectedSemester.lessons" class="px-5 w-screen text-left flex flex-wrap justify-between">
                    <li v-for="lesson of selectedSemester.lessons" class="my-2 w-[48%]" @click="selectLesson(lesson.entry || null)">
                        <GradientBorder :small="true" style="--gradient: linear-gradient(to bottom, #adb0b8, #3e3f44)" class="rounded-md">
                            <div class="p-2">
                                <div class="leading-4 break-all">
                                    <span header-alike>{{ lesson.topic }}</span>
                                    <small class="ml-1"
                                        >am <b>{{ parseDate(lesson.date) }}</b></small
                                    >
                                </div>
                                <div class="flex lesson-notifications">
                                    <div :class="lesson.homework.done ? 'bg-green-500' : 'bg-red-500'" v-if="lesson.homework">
                                        <font-awesome-icon :icon="['fas', 'pen-to-square']"></font-awesome-icon>
                                    </div>
                                    <div class="bg-blue-500" v-if="lesson.downloads.files.length">
                                        <font-awesome-icon :icon="['fas', 'download']"></font-awesome-icon>
                                        <span>{{ lesson.downloads.files.length }}</span>
                                    </div>
                                    <div class="bg-amber-500" v-if="lesson.uploads.length">
                                        <font-awesome-icon :icon="['fas', 'upload']"></font-awesome-icon>
                                    </div>
                                </div>
                            </div>
                        </GradientBorder>
                    </li>
                </ul>
                <div class="error" v-else-if="fetchError !== null">
                    <span>{{ fetchError }}</span>
                </div>
                <div v-else class="spinner justify-self-center my-2" style="--size: 2rem"></div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getNameDataFromProperty } from "~/composables/surname";

const CURRENT_SEMESTER = parseInt(useRuntimeConfig().public.currentSemester as string);
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

const hasInvidiualLessonOpen = ref(true);
const semester = ref(CURRENT_SEMESTER);
const semesters = ref<{ [key: number]: MyLessonsSemester }>({});
const selectedSemester = computed(() => semesters.value[semester.value] ?? []);
const lesson = computed(() =>
    selectedLesson.value !== null ? selectedSemester.value.lessons.find((x) => x.entry === selectedLesson.value) : course.value.last_lesson
);
const selectedLesson = ref<number | null>(null);

const image = useState<string>("selected-mylessons-course-image");
const course = useSelectedMyLessonsCourse();

async function switchToLessonsList() {
    useSheetTransition("lessons", () => (hasInvidiualLessonOpen.value = false));
}

function selectLesson(id: number | null) {
    useSheetTransition("lessons", async () => {
        selectedLesson.value = id;
        hasInvidiualLessonOpen.value = true;
    });
}

const teacherName = computed(() => {
    const { full } = course.value.teacher;
    if (full === null) return "";
    const data = getNameDataFromProperty("full", full);
    return `${data?.firstname} ${data?.surname}`;
});

function parseDate(text: string | null = "") {
    if (typeof text !== "string") return "<unbekannt>";
    const date = new Date(text);
    if (date.toDateString() === "Invalid Date") return "<unbekannt>";
    return `${addZeroToNumber(date.getDate())}. ${MONTHS[date.getMonth()]}.`;
}

const fetchError = ref<any>(null);
async function fetchSemesterData() {
    // No need to refetch the data if it already exists
    if (semesters.value[semester.value]) return;
    try {
        fetchError.value = null;
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
    } catch (error) {
        fetchError.value = error;
    }
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
    li:hover:active {
        scale: 105%;
        transition: 100ms;
    }
    .lesson-notifications div {
        @apply rounded-full px-[0.4rem] h-6 flex justify-center items-center mx-0.5 mt-1.5;
        span {
            @apply px-0.5;
        }
    }
}
#sheet-inner-content {
    clip-path: var(--full-clip-path);
}
</style>
