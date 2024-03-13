<template>
    <main v-if="cards.includes('lessons')">
        <GradientBorder class="mb-2 rounded-2xl w-[90%] mx-[5%] max-w-[18rem]">
            <div class="px-5 py-2">
                <div id="courses">
                    <div class="flex">
                        <h1>Deine Kurse</h1>
                        <span class="course-counter" v-if="courses && Array.isArray(courses.courses)">{{ courses.courses.length }}</span>
                    </div>
                    <div class="grid place-content-center py-2" v-if="!courses || typeof courses === 'string' || !courses.courses">
                        <div class="error" v-if="errors.mylessons">
                            <span>{{ errors.mylessons }}</span>
                        </div>
                        <div class="flex placeholder pl-3 mb-[-1rem]" v-else>
                            <article excluded v-for="n in 4">
                                <div class="flex justify-center" excluded>
                                    <small rounded></small>
                                </div>
                                <small></small>
                                <small></small>
                            </article>
                        </div>
                    </div>
                    <p v-else-if="!courses.courses.length" class="text-center py-1">Keine Kurse</p>
                    <div class="overflow-y-scroll overflow-x-hidden relative grid" v-else>
                        <article
                            class="opacity-0 my-1 items-center overflow-x-hidden flex"
                            v-for="(course, index) of coursesSortedByHomework"
                            @click="openSheet(course, proxyUserImage(teacherImagesForCourses[index]?.teacher.image))">
                            <img class="rounded-full h-6 inline-flex" :src="proxyUserImage(teacherImagesForCourses[index]?.teacher.image)" />
                            <span class="whitespace-nowrap ml-1">{{ course.subject }}</span>
                            <small class="whitespace-nowrap text-xs mt-1 ml-1">
                                bei <b>{{ course.teacher.full?.split(", ")[0] }}</b></small
                            >
                            <div class="absolute right-0 flex bg-[#181818]" id="icons">
                                <span class="bg-blue-500" v-if="course.last_lesson?.downloads">
                                    <font-awesome-icon :icon="['fas', 'download']"></font-awesome-icon>
                                </span>
                                <span class="bg-amber-500" v-if="course.last_lesson?.uploads">
                                    <font-awesome-icon :icon="['fas', 'upload']"></font-awesome-icon>
                                </span>
                                <span class="bg-red-500" v-if="course.last_lesson?.homework?.done === false">
                                    <font-awesome-icon :icon="['fas', 'pen-to-square']"></font-awesome-icon>
                                </span>
                            </div>
                        </article>
                    </div>
                </div>
            </div>
        </GradientBorder>
    </main>
    <footer>
        <button @click="openLink('https://start.schulportal.hessen.de/meinunterricht.php')">
            <font-awesome-icon :icon="['fas', 'up-right-from-square']"></font-awesome-icon>
            <span>Öffnen</span>
        </button>
    </footer>
</template>

<script setup lang="ts">
// This is the default image used by SPH, just uploaded there
// so it is accessible without authentication
// -> findable under https://start.schulportal.hessen.de/benutzerverwaltung.php?a=userFoto&b=show
const DEFAULT_USER_IMAGE = "/moodle-default.png";
const courses = useMyLessonsCourses();
const lerngruppen = useLerngruppen();
const cards = useOpenCards();
const errors = useAppErrors();
onMounted(() => fadeIn());
watch(courses, () => fadeIn());
watch(cards, (value, old) => {
    if (value.includes("lessons") && !old.includes("lessons")) fadeIn();
});
const coursesSortedByHomework = computed(() =>
    courses.value.courses.sort((a, b) => {
        const hasHomework = [a, b].map((course) => course.last_lesson?.homework && !course.last_lesson.homework.done);
        if (hasHomework[0] && !hasHomework[1]) return -1;
        if (!hasHomework[0] && hasHomework[1]) return 1;

        // If however the homework has already been completed, we
        // don't need to show it off right at the top
        if (a.last_lesson?.homework && !a.last_lesson.homework.done) return 1;

        const subjects = [a, b].map((course) => course.subject || "");

        if (subjects[0] < subjects[1]) return -1;
        if (subjects[0] > subjects[1]) return 1;

        return 0;
    })
);
const teacherImagesForCourses = computed(() => {
    if (!lerngruppen.value || !coursesSortedByHomework.value) return [];
    return coursesSortedByHomework.value.map((course) => {
        // Some courses on mylessons may have a class or subject type attached to them
        // -> they are encapsuled and can thusly be removed
        const courseNameWithoutSubject = course.subject?.replace(/\([^()]+\)/gi, "").trim();
        // As this is just for fetching the teacher images, it does not really matter
        // if we may fetch a course of another subject with the same teacher
        return lerngruppen.value.find((gruppe) => courseNameWithoutSubject === gruppe.course || gruppe.teacher.name === course.teacher.full);
    });
});
async function fadeIn() {
    if (!cards.value.includes("lessons")) return;
    async function fadeInElement(element: Element, index: number) {
        if (!(element instanceof HTMLElement)) return;
        await useWait(index * 80);
        element.animate(
            [
                { opacity: 0, transform: "scale(90%)" },
                { opacity: 1, transform: "scale(100%)" }
            ],
            400
        );
        await useWait(390);
        element.style.opacity = "1";
    }
    await nextTick();
    document.querySelectorAll("article[card=lessons] #courses article").forEach(fadeInElement);
}
function proxyUserImage(image?: string | null) {
    if (typeof image !== "string") return DEFAULT_USER_IMAGE;
    return `/api/proxy?token=${useToken().value}&path=${encodeURIComponent(image)}`;
}
function openSheet(course: MyLessonsCourse, image: string) {
    useSelectedMyLessonsCourse().value = course;
    useState("selected-mylessons-course-image").value = image;
    useOpenSheet("lessons");
}
</script>

<style scoped>
::-webkit-scrollbar {
    display: none;
}
#courses {
    .placeholder > article {
        small {
            @apply w-full h-3 rounded-full;
        }
        small[rounded] {
            @apply rounded-full w-3;
        }
    }
    article:not(.placeholder):hover:active {
        @apply scale-95;
    }
    article {
        #icons span {
            @apply rounded-full h-6 w-6 grid place-content-center text-sm mx-0.5;
        }
    }
}
</style>
