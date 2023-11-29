<template>
    <main v-if="cardsOpen.includes('lessons')">
        <div class="mb-2 relative rounded-2xl w-[90%] mx-[5%] z-0 gradient-border max-w-[18rem] text-white">
            <div class="px-5 py-2">
                <div id="courses">
                    <div class="flex">
                        <h1>Deine Kurse</h1>
                        <span class="course-counter" v-if="courses && courses.courses">{{ courses.courses.length }}</span>
                    </div>
                    <div class="grid place-content-center py-2" v-if="!courses || typeof courses === 'string' || !courses.courses">
                        <div class="error" v-if="appErrors.mylessons">
                            <span>{{ appErrors.mylessons }}</span>
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
                    <div class="flex overflow-x-scroll" v-else>
                        <article class="opacity-0" v-for="course of coursesSortedByHomework" @click="selectCourse(course.id)">
                            <div class="flex justify-center w-full">
                                <span v-if="course.last_lesson?.homework" class="news-icon justify-self-center" :style="course.last_lesson.homework.done ? 'background: #4ade80;' : ''">HA</span>
                                <ClientOnly v-else>
                                    <font-awesome-icon class="mr-1.5" :icon="['fas', 'book']"></font-awesome-icon>
                                </ClientOnly>
                            </div>
                            <small>
                                {{ course.subject }}
                            </small>
                        </article>
                    </div>
                </div>
                <div id="details">
                    <div class="flex items-center">
                        <h1>Kursdetails</h1>
                        <small class="ml-1 overflow-hidden whitespace-nowrap text-ellipsis">
                            für {{ selected > -1 ? selectedCourse?.subject : "<nichts>" }}
                        </small>
                    </div>
                    <p class="text-center text-sm" v-if="selected === -1 || !selectedCourse">Wähle einen Kurs aus</p>
                    <div id="content" v-else class="px-2">
                        <div id="attendance" v-if="selectedCourse.attendance">
                            <span header-alike>Anwesendheit</span>
                            <ul>
                                <li v-for="item of Object.keys(selectedCourse.attendance)">
                                    <span v-if="selectedCourse.attendance[item]">
                                        {{ selectedCourse.attendance[item] }} Stunde(n) {{ item }}
                                    </span>
                                </li>
                            </ul>
                        </div>
                        <div v-if="selectedCourse.last_lesson">
                            <p class="text-center">
                                <span header-alike class="text-[0.9rem]">Letzte Stunde</span>
                                <small> am {{ selectedCourse.last_lesson.date?.split("-").reverse().join(".") }}</small>
                            </p>
                            <small class="text-center block"><span header-alike>Thema: </span>{{ selectedCourse.last_lesson.topic }}</small>
                            <div v-if="selectedCourse.last_lesson.homework" class="mt-1">
                                <div class="flex">
                                    <ClientOnly>
                                        <span class="text-lg" id="homework-status">
                                            <font-awesome-icon v-if="selectedCourse.last_lesson.homework.done" class="bg-green-400" :icon="['fas', 'check']"></font-awesome-icon>
                                            <font-awesome-icon v-else class="bg-red-500" :icon="['fas', 'xmark']"></font-awesome-icon>
                                        </span>
                                    </ClientOnly>
                                    <span class="ml-1.5">Hausaufgaben {{ !selectedCourse.last_lesson.homework.done ? "nicht " : "" }}erledigt</span>
                                </div>
                                <small class="leading-3 block" v-html="selectedCourse.last_lesson.homework.description || '<leer> (Merkwürdig...)'"></small>
                                <div class="flex justify-center">
                                    <button class="button-with-symbol" @click="updateHomework(selectedCourse.id, selectedCourse.last_lesson.homework.done ? 'undone' : 'done')">
                                        <ClientOnly>
                                            <font-awesome-icon :icon="['fas', selectedCourse.last_lesson.homework.done ? 'xmark' : 'check']"></font-awesome-icon>
                                        </ClientOnly>
                                        <span>Als <b>{{ selectedCourse.last_lesson.homework.done ? "un" : "" }}erledigt</b> markieren</span>
                                    </button>
                                </div>
                                <div class="flex justify-center mt-2">
                                    <div class="error" v-if="homeworkError">
                                        <span>{{ homeworkError }}</span>
                                    </div>
                                </div>
                            </div>
                            <p v-else class="text-center text-sm">Keine Hausaufgaben</p>
                        </div>
                    </div>
                </div>
            </div>
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
    mounted() {
        this.fadeIn();
    },
    data() {
        return {
            cardsOpen: useState<Array<string>>("cards-open"),
            appErrors: useAppErrors(),
            courses: useState<MyLessonsAllCourses>("mylessons"),
            selected: -1,
            homeworkError: ""
        };
    },
    props: {
        extended: { type: Boolean, required: true }
    },
    computed: {
        coursesSortedByHomework() {
            if (!this.courses || !this.courses.courses) return null;
            return this.courses.courses.sort((a, b) => {

                const hasHomework = [a, b].map((course) => (course.last_lesson?.homework && !course.last_lesson.homework.done));
                if (hasHomework[0] && !hasHomework[1]) return -1;
                if (!hasHomework[0] && hasHomework[1]) return 1;

                if (a.last_lesson?.homework && !a.last_lesson.homework.done) return 1;

                const subjects = [a, b].map((course) => course.subject || "");
            
                if (subjects[0] < subjects[1]) return -1;
                if (subjects[0] > subjects[1]) return 1;

                return 0;

            });
        },
        selectedCourse() {
            if (!this.coursesSortedByHomework) return null;
            return this.coursesSortedByHomework.find((x) => x.id === this.selected)
        }
    },
    methods: {
        selectCourse(id: number) {
            if (!this.coursesSortedByHomework || !this.coursesSortedByHomework.find((x) => x.id === id)) return;
            this.selected = id;
        },
        async fadeIn() {
            if (!this.extended) return;
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
            await useWait(10);
            if (!this.courses || !this.courses.courses) return;
            document.querySelectorAll("article[card=lessons] #courses article").forEach(fadeInElement);
        },
        async updateHomework(id: number, action: "done" | "undone") {
            const courseIndex = this.courses.courses.findIndex((x) => x.id === id);
            const course = this.courses.courses[courseIndex];
            if (!course || !course.last_lesson || !course.last_lesson.homework) return;
            const {data, error} = await useFetch<{ error: boolean; error_details?: any }>("/api/mylessons/homework", {
                method: "POST",
                headers: {
                    Authorization: useToken().value
                },
                body: {
                    lesson: course.last_lesson?.index,
                    action,
                    id
                }
            });

            if (data.value === null || error.value !== null) {

                this.homeworkError = error.value?.data.error_details || "Serverfehler";
                await useWait(3000);
                return this.homeworkError = "";

            }

            // @ts-expect-error we already have run all the checks
            this.courses.courses[courseIndex].last_lesson.homework.done = action === "done";
            await useWait(1);
            useAppNews().value.lessons = this.courses.courses.reduce((acc, course) => acc + (course.last_lesson?.homework && !course.last_lesson.homework.done ? 1 : 0), 0);
        }
    },
    watch: {
        courses() {
            this.fadeIn();
        },
        extended() {
            this.fadeIn();
            this.selected = -1;
        }
    }
});
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
    article {
        small {
            @apply mt-1 block;
        }
        span {
            font-size: 0.65rem;
        }
        @apply h-14 min-w-[3.5rem] w-14 overflow-hidden text-ellipsis text-center mt-1 mr-3 relative;
        line-break: anywhere;
        line-height: 0.8;
    }
    article:not(.placeholder):hover:active {
        @apply scale-95;
    }
}
#details {
    @apply mt-4 pt-2;
    border-top: solid 1px;
    border-image: linear-gradient(to left, transparent 0%, #ffffff 50%, transparent 100%) 1;
}
#homework-status > svg {
    @apply rounded-full aspect-square p-0.5;
}
#attendance {
    @apply mb-1 pb-2 text-sm text-center;
    border-bottom: solid 1px #636363;
}
</style>
