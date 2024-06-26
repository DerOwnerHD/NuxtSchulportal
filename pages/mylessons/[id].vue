<template>
    <div class="h-full py-4">
        <ErrorDisplay :error="errors.get(AppID.MyLessonsCourse)" v-if="errors.has(AppID.MyLessonsCourse)" :retry-function="loadCourse"></ErrorDisplay>
        <div v-else-if="courseData" class="content grid gap-4 w-screen h-full pb-2">
            <InfoBox class="w-fit justify-self-center" type="error" v-if="!hasValidAESKeySet()">
                <span>Anwesendheiten sind nicht verfügbar</span>
                <ButtonRoundedBlurred @click="loadCourse(true)" :icon="['fas', 'arrow-rotate-right']"></ButtonRoundedBlurred>
            </InfoBox>
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
                    class="lessons-container opacity-0 flex w-screen overflow-scroll px-10 min-h-72"
                    @scroll.passive="updateScroll"
                    @scrollend.passive="endScroll">
                    <DeckCard v-for="lesson of courseData.lessons" v-if="showElements">
                        <MyLessonsCard :lesson="lesson" :course="courseData.id"></MyLessonsCard>
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
    const container = document.querySelector<HTMLElement>(".lessons-container");
    if (container === null) return;
    const child = container.querySelector<HTMLElement>(`.deck-card:nth-child(${lesson + 1})`);
    if (child === null) return;
    child.style.transitionDuration = "0ms";
    child.style.scale = "1";
    [lesson - 1, lesson + 1].map(async (x) => {
        const child = container.children[x] as HTMLElement;
        if (!child) return;
        // These cards are supposed to switch instantly,
        // having a transition in place destroys this
        child.style.transitionDuration = "0ms";
        child.style.scale = "0.85";
        await nextTick();
        child.style.transitionDuration = "";
    });
    child.scrollIntoView({ behavior: "instant", inline: "center" });
    child.style.transitionDuration = "";
}
onMounted(() => {
    loadCourse();
    if (!isEventHandlerRegistered.value) {
        window.addEventListener("resize", handleResize);
        isEventHandlerRegistered.value = true;
    }
    handleResize();
});
onUnmounted(() => {
    errors.value.delete(AppID.MyLessonsCourse);
    window.removeEventListener("resize", handleResize);
    isEventHandlerRegistered.value = false;
});
const isEventHandlerRegistered = ref(false);
async function handleResize() {
    await resizeCards();
    await useWait(100);
    updateScroll();
    await useWait(100);
    endScroll();
}
async function loadCourse(overwrite?: boolean) {
    errors.value.delete(AppID.MyLessonsCourse);
    if (!NUMBER_PATTERN.test(courseId)) return errors.value.set(AppID.MyLessonsCourse, "Ungültige ID");
    // @ts-ignore
    courseData.value = await fetchMyLessonsCourse(parseInt(courseId), overwrite);
}

const CARD_WIDTH = 288;
const CARD_CENTER = CARD_WIDTH / 2;
watch(courseData, async () => {
    await useWait(100);
    window.removeEventListener("resize", handleResize);
    isEventHandlerRegistered.value = false;
    handleResize();
    if (!isEventHandlerRegistered.value) {
        window.addEventListener("resize", handleResize);
        isEventHandlerRegistered.value = true;
    }
});

async function resizeCards() {
    const container = document.querySelector<HTMLElement>(".lessons-container");
    if (container === null) return;
    const parent = container.parentElement;
    if (parent === null) return;
    // Whenever the cards are hidden and the height is auto, the container
    // takes the size it is actually supposed to have.
    parent.style.height = "";
    showElements.value = false;
    await useWait(100);
    // Sadly, we need to set the height of the parent, to prevent the
    // whole container from overflowing when we have a big card. In
    // this case, the page should not be scrollable, only the cards
    // themselves. Having to scroll the page could hide the counters
    // at the bottom and switching cards would wobble the whole content
    // around.
    parent.style.height = parent.clientHeight + "px";
    showElements.value = true;
    await nextTick();
    container.style.opacity = "1";
}
/**
 * This is a Safari fix. Whenever the user is scrolling, we'd expect
 * a scroll event every few ms. So when there hasn't been any for a
 * pretty long time, we can safely assume there is no scroll action.
 */
const MAX_SCROLL_INTERVAL = 200;
// Contains the index of the card with the largest scale
const closestCard = ref({ index: 0, scale: 0 });
const scrollTimeout: Ref<NodeJS.Timeout | undefined> = ref();
function updateScroll() {
    const container = document.querySelector<HTMLElement>(".lessons-container");
    if (container === null) return;
    const cards = Array.from(container.querySelectorAll<HTMLElement>(".deck-card"));
    const screenCenter = window.innerWidth / 2;
    closestCard.value.scale = 0;
    // We find the card with the biggest scale at the moment
    // If this is the last time the scroll event fires, the scrollend
    // event handler will scroll to that card. The current card is reset
    // every scroll event and is recalculated. Cards outside a certain
    // area have their scale set to 0 (performance)
    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const dimensions = card.getBoundingClientRect();
        const cardCenter = dimensions.left + CARD_CENTER;
        // The distance from the center of the screen
        const cardDistance = Math.abs(screenCenter - cardCenter);
        // If the card has a distance greater than three times a card width, the scale is set to the min
        // -> only the closest cards are actually processed
        // We scale inside the area of 1.0 to 0.85 scale, depending on the distance from center
        const scale = cardDistance > 3 * CARD_WIDTH ? 0.85 : clampNumber(1 - 0.15 * (cardDistance / window.innerWidth), 0.85, 1);
        if (closestCard.value.scale < scale) closestCard.value = { scale, index: i };
        card.style.scale = scale.toFixed(3);
    }
    selected.value = closestCard.value.index;
    clearTimeout(scrollTimeout.value);
    // This might fire twice, it really isn't important though
    scrollTimeout.value = setTimeout(endScroll, MAX_SCROLL_INTERVAL);
}
// The scrollend event does not exist on Safari *sigh*.
// https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollend_event#browser_compatibility
// => This causes these devices to fail to snap to any element
// The bottom counter is however refreshed every scroll event, thus
// it is not affected by this annoying thing.
function endScroll() {
    clearTimeout(scrollTimeout.value);
    const container = document.querySelector<HTMLElement>(".lessons-container");
    if (container === null) return;
    const child = container.querySelector(`.deck-card:nth-child(${closestCard.value.index + 1})`);
    if (child === null) return;
    child.scrollIntoView({ behavior: "smooth", inline: "center" });
    selected.value = closestCard.value.index;
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
    transition: scale 100ms !important;
    background: radial-gradient(#302e44, #302f37) center;
}
</style>
