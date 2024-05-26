<template>
    <div class="h-full py-4">
        <ErrorDisplay :error="errors.get(AppID.MyLessonsCourse)" v-if="errors.has(AppID.MyLessonsCourse)" :retry-function="loadCourse"></ErrorDisplay>
        <div v-else-if="courseData" class="content grid gap-4 w-screen h-full pb-2">
            <header class="grid items-center justify-center gap-2 w-screen px-4">
                <div class="h-12 grid relative w-fit">
                    <NuxtImg class="h-12" src="icons/folder.svg"></NuxtImg>
                    <font-awesome-icon
                        class="absolute justify-self-center drop-shadow-sm text-lg top-6 opacity-70"
                        v-if="icon"
                        :icon="icon"></font-awesome-icon>
                </div>
                <div class="fade overflow-hidden px-4">
                    <ScrollingText :start-delay="3000" font="bold 30px Merriweather" :pixels-per-second="16">
                        {{ courseData.subject }}
                    </ScrollingText>
                </div>
            </header>
            <main class="grid">
                <div
                    class="lessons-container opacity-0 grid w-screen gap-4 overflow-scroll"
                    @scroll="updateScroll"
                    @scrollend="endScroll"
                    :class="{ '!overflow-hidden': courseData.lessons.length === 1 }">
                    <DeckCard v-if="showElements" previous :class="{ 'opacity-0': !previousLesson }">
                        <MyLessonsCard :lesson="previousLesson" :course="courseData.id"></MyLessonsCard>
                    </DeckCard>
                    <DeckCard v-if="showElements" current>
                        <MyLessonsCard :lesson="selectedLesson" :course="courseData.id"></MyLessonsCard>
                    </DeckCard>
                    <DeckCard v-if="showElements" next :class="{ 'opacity-0': !nextLesson }">
                        <MyLessonsCard :lesson="nextLesson" :course="courseData.id"></MyLessonsCard>
                    </DeckCard>
                </div>
                <ItemCounter :items="counters" :index="selected" @move="updateSelectedLesson"></ItemCounter>
            </main>
        </div>
        <div v-else class="h-full w-screen grid place-content-center">
            <InfiniteSpinner :size="50"></InfiniteSpinner>
        </div>
    </div>
</template>

<script setup lang="ts">
const showElements = ref(false);
const errors = useAppErrors();
const route = useRoute();
const courseId = route.params.id as string;
const courseData = ref<MyLessonsCourse | null>(null);
const NUMBER_PATTERN = /^\d+$/;
const icon = computed(() => {
    if (!courseData.value) return null;
    return findIconForMyLessonsCourse(courseData.value.subject ?? "");
});
const selected = ref(0);
const selectedLesson = computed(() => courseData.value?.lessons.at(selected.value) ?? null);
const previousLesson = computed(() => {
    if (!courseData.value) return null;
    // If we just invoked -1 as an index, we would get the last item
    if (selected.value === 0) return null;
    return courseData.value.lessons.at(selected.value - 1) ?? null;
});
const nextLesson = computed(() => {
    if (!courseData.value) return null;
    if (selected.value === courseData.value.lessons.length - 1) return null;
    return courseData.value.lessons.at(selected.value + 1) ?? null;
});
const counters = computed(() => {
    if (!courseData.value) return [];
    return courseData.value.lessons.map((x) => {
        return {
            title: x.topic ?? "",
            subtitle: relativeOrAbsoluteDateFormat(x.date ?? "", "day-month-short")
        };
    });
});
function updateSelectedLesson(lesson: number) {
    selected.value = lesson;
}
onMounted(() => {
    loadCourse();
});
onUnmounted(() => {
    errors.value.delete(AppID.MyLessonsCourse);
});
async function loadCourse() {
    errors.value.delete(AppID.MyLessonsCourse);
    if (!NUMBER_PATTERN.test(courseId)) return errors.value.set(AppID.MyLessonsCourse, "Ungültige ID");
    // @ts-ignore
    courseData.value = await fetchMyLessonsCourse(parseInt(courseId));
}

const CARD_WIDTH = 288;
watch(courseData, async () => {
    await useWait(100);
    const container = document.querySelector<HTMLElement>(".lessons-container");
    if (container === null) return;
    const parent = container.parentElement;
    if (parent === null) return;
    parent.style.height = parent.clientHeight + "px";
    showElements.value = true;
    await nextTick();
    container.scrollTo({ left: container.scrollWidth / 2 - CARD_WIDTH / 2 - (window.innerWidth - CARD_WIDTH) / 2 });
    container.style.opacity = "1";
});

const scrollStart = ref<number | null>(null);
const MAX_SCROLL = CARD_WIDTH * 0.9;
const CARD_MARGIN = 16;
function updateScroll() {
    const container = document.querySelector<HTMLElement>(".lessons-container");
    if (container === null) return;
    if (scrollStart.value === null) scrollStart.value = container.scrollLeft;
    const difference = container.scrollLeft - scrollStart.value;
    const scale = clampNumber(0.9 + 0.1 * (Math.abs(difference) / CARD_WIDTH) + 0.02, 0.9, 1).toFixed(3);
    const scaleForSelected = clampNumber(1 - 0.1 * (Math.abs(difference) / CARD_WIDTH), 0.9, 1).toFixed(3);
    // @ts-ignore
    container.children[0].style.transform = `scale(${scale})`;
    // @ts-ignore
    container.children[1].style.transform = `scale(${scaleForSelected})`;
    // @ts-ignore
    container.children[2].style.transform = `scale(${scale})`;
    if (Math.abs(difference) > MAX_SCROLL) {
        if (difference > 0 && nextLesson.value) selected.value += 1;
        else if (difference < 0 && previousLesson.value) selected.value -= 1;
        container.scrollTo({ left: container.scrollWidth / 2 - CARD_WIDTH / 2 - (window.innerWidth - CARD_WIDTH) / 2, behavior: "instant" });
        scrollStart.value = null;
    }
}
function endScroll() {
    const container = document.querySelector<HTMLElement>(".lessons-container");
    if (container === null) return;
    if (scrollStart.value === null) return;
    const difference = container.scrollLeft - scrollStart.value;
    if (Math.abs(difference) > MAX_SCROLL / 2) {
        if (difference > 0 && nextLesson.value) container.scrollTo({ left: scrollStart.value + MAX_SCROLL + CARD_MARGIN, behavior: "smooth" });
        else if (difference < 0 && previousLesson.value) container.scrollTo({ left: 0, behavior: "smooth" });
    } else {
        container.scrollTo({ left: scrollStart.value, behavior: "smooth" });
    }
}
</script>

<style scoped>
header {
    grid-template-columns: max-content auto;
}
.fade {
    mask-image: var(--horizontal-fade-mask);
    max-width: fit-content;
}
.content {
    grid-template-rows: auto 1fr;
}
main {
    grid-template-rows: 1fr min-content;
}
.lessons-container {
    grid-template-columns: 1fr 1fr 1fr;
}
.deck-card[previous],
.deck-card[next] {
    transform: scale(90%);
}
.deck-card[previous] {
    transform-origin: center right;
}
.deck-card[next] {
    transform-origin: center left;
}
.deck-card {
    @apply h-full max-h-full overflow-y-scroll;
}
</style>
