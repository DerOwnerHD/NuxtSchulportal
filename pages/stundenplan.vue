<template>
    <div class="h-full">
        <AppErrorDisplay :id="AppID.Stundenplan" v-if="hasAppError(AppID.Stundenplan)"></AppErrorDisplay>
        <div class="my-2" v-else-if="plans && selectedPlan">
            <SplanAnnouncement></SplanAnnouncement>
            <div class="blurred-background grid m-2 rounded-2xl place-content-center p-2 text-center gap-2">
                <FluidButtonGroup>
                    <FluidSelection
                        id="splan-switcher"
                        :options="planSelectionOptions"
                        :show-amount="true"
                        @update="updateSelectedPlan"></FluidSelection>
                    <FluidToggle
                        :icon="['fas', 'code-compare']"
                        :state="comparisonMode"
                        :disabled="selectedPlan.current"
                        @update="(state) => (comparisonMode = state)">
                        <div class="grid">
                            <span>Vergleichen</span>
                            <span class="text-xs">mit aktivem Plan</span>
                        </div>
                    </FluidToggle>
                </FluidButtonGroup>
                <div class="flex flex-wrap gap-2 justify-center" id="splan-date-display">
                    <div class="bg-green-500 rounded-full px-2" v-if="selectedPlan.current">aktiv</div>
                    <div class="bg-gray-500 rounded-full px-2">{{ convertDateStringToFormat(selectedPlan.start_date, "day-month-full") }}</div>
                    <span>-</span>
                    <div class="bg-gray-500 rounded-full px-2">
                        {{ selectedPlan.end_date ? convertDateStringToFormat(selectedPlan.end_date, "day-month-full") : "unbekannt" }}
                    </div>
                </div>
                <div class="flex justify-center gap-2">
                    <div
                        v-for="[color, type, text] of weekButtons"
                        :style="{ '--color': color }"
                        :class="{ selected: selectedWeekType === type }"
                        class="week"
                        @click="selectedWeekType = type">
                        {{ text }}
                    </div>
                </div>
            </div>
            <div
                class="grid w-screen min-h-full text-center gap-2 px-2"
                id="stundenplan"
                :class="{
                    secret: secretMode
                }"
                v-if="!comparisonMode || (comparisonMode && comparisonResult)"
                :style="{
                    // We add one for the CSS at the bottom (requires one more than actual rows due to grid-row-end)
                    // And then another one for our top bar
                    // @ts-ignore
                    '--lesson-count': !comparisonMode ? selectedPlan.lessons.length + 2 : comparisonResult.lessons.length + 2
                }">
                <div class="lesson-list grid">
                    <div
                        class="lesson px-2 py-1"
                        v-for="(lesson, index) of comparisonMode && comparisonResult ? comparisonResult?.lessons : selectedPlan.lessons">
                        <span class="font-bold">{{ index + 1 }}.</span>
                        <span class="text-xs block">
                            {{ convertStundenplanTimeFormat(lesson) }}
                        </span>
                    </div>
                </div>
                <div class="day grid" v-for="(day, index) of weekSpecificPlan.days" v-if="weekSpecificPlan && !comparisonMode">
                    <div class="day-label">{{ WEEKDAYS.short[index] }}</div>
                    <div class="lesson" v-for="lesson of day.lessons" :style="generateStylesForLesson(lesson.lessons)">
                        <div v-if="lesson.classes.length" class="grid h-full items-center gap-2">
                            <div class="subject grid items-center" v-for="subject of lesson.classes">
                                <span class="font-bold">{{ subject.name }}</span>
                                <span class="text-xs grid gap-1">
                                    <span class="block">
                                        {{ subject.room }}
                                    </span>
                                    <span class="block">
                                        {{ subject.teacher }}
                                    </span>
                                </span>
                            </div>
                        </div>
                        <span v-else>-</span>
                    </div>
                </div>
                <div class="day grid" v-for="(day, index) of comparisonResult.differences" v-else-if="comparisonMode && comparisonResult">
                    <div class="day-label">{{ WEEKDAYS.short[index] }}</div>
                    <div class="lesson" :data-compare-type="lesson.type" v-for="lesson of day" :style="generateStylesForLesson(lesson.lessons)">
                        <div v-if="lesson.subjects.length" class="grid h-full items-center gap-2">
                            <div class="subject grid items-center" :data-compare-type="subject.type" v-for="subject of lesson.subjects">
                                <span class="font-bold">{{ subject.data.name }}</span>
                                <span class="text-xs grid gap-1">
                                    <div v-if="subject.type === 'updated' && subject.updates && subject.updates.has('room')">
                                        <div class="update-old">{{ subject.updates.get("room")?.at(1) }}</div>
                                        <font-awesome-icon :icon="['fas', 'long-arrow-down']"></font-awesome-icon>
                                        <div class="update-new">{{ subject.updates.get("room")?.at(0) }}</div>
                                    </div>
                                    <span class="block" v-else>
                                        {{ subject.data.room }}
                                    </span>
                                    <div v-if="subject.type === 'updated' && subject.updates && subject.updates.has('teacher')">
                                        <div class="update-old">{{ subject.updates.get("teacher")?.at(1) }}</div>
                                        <font-awesome-icon :icon="['fas', 'long-arrow-down']"></font-awesome-icon>
                                        <div class="update-new">{{ subject.updates.get("teacher")?.at(0) }}</div>
                                    </div>
                                    <span class="block" v-else>
                                        {{ subject.data.teacher }}
                                    </span>
                                </span>
                            </div>
                        </div>
                        <span v-else>-</span>
                    </div>
                </div>
            </div>
        </div>
        <FullPageSpinner v-else></FullPageSpinner>
    </div>
</template>

<script setup lang="ts">
const plans = useStundenplan();
const secretMode = isSecretModeActive();
const selected = ref(0);
const selectedPlan = computed(() => {
    if (!plans.value) return null;
    return plans.value[selected.value];
});
const route = useRoute();
onMounted(() => navigateToSelectedPlan());
// When we are already on a plan, pressing a button on the flyout won't do anything
// -> the plan is not refreshed nor is the page remounted
watch(plans, () => navigateToSelectedPlan());

/**
 * True is an even week, false an uneven week
 */
const currentWeekType = computed(() => new Date().getWeek() % 2 === 0);
const selectedWeekType = ref<WeekType>(currentWeekType.value ? "even" : "odd");
type WeekType = "even" | "odd" | "all";
const weekButtons: [string, WeekType, string][] = [
    ["#d97706", "even", "A-Woche"],
    ["#6366f1", "odd", "B-Woche"],
    ["#6b7280", "all", "Alle"]
];

function navigateToSelectedPlan() {
    if (!plans.value) return;
    const planId = Array.isArray(route.query.plan) ? route.query.plan.at(0) : route.query.plan;
    if (!planId) return;
    const index = plans.value.findIndex((plan) => plan.start_date === planId);
    if (index === -1) return;
    selected.value = index;
}

async function updateSelectedPlan(id: string) {
    const plan = document.querySelector("#stundenplan");
    const dateDisplay = document.querySelector("#splan-date-display");
    const prettyAnimationOptions = { duration: 300, easing: "ease-in-out", fill: "forwards" } as KeyframeAnimationOptions;
    if (plan === null) return console.error("How... did we get here though??");
    plan.animate({ opacity: "0" }, prettyAnimationOptions);
    dateDisplay?.animate({ opacity: "0" }, prettyAnimationOptions);
    await useWait(prettyAnimationOptions.duration as number);
    comparisonMode.value = false;
    const index = plans.value.findIndex((plan) => plan.start_date === id);
    if (index === -1) return;
    selected.value = index;
    // If we have a large plan, we first need to actually get that new data on there
    await nextTick();
    plan.animate({ opacity: "1" }, prettyAnimationOptions);
    dateDisplay?.animate({ opacity: "1" }, prettyAnimationOptions);
    const planAtIndex = plans.value[index];
    if (!planAtIndex) return console.error("Huh? Plan not found for one we just selected");
    // This acts the same way as the selection in the dock flyout
    // Has no effect but when the user reloads the site, they get thrown out at this one
    navigateTo(`/stundenplan?plan=${planAtIndex.start_date}`);
}
const planSelectionOptions = computed(() => {
    if (!plans.value) return [];
    return plans.value.map((plan, index) => {
        return {
            title: `${convertDateStringToFormat(plan.start_date, "day-month-full", true)}${plan.current ? " (aktiv)" : ""}`,
            subtitle: plan.end_date ? `Bis ${convertDateStringToFormat(plan.end_date, "day-month-full", true)}` : "",
            id: plan.start_date,
            default: index === selected.value
        };
    });
});
const comparisonMode = ref(false);
const compareTarget = computed(() => plans.value[selected.value]?.start_date);
const comparisonResult = computed(() => {
    if (!comparisonMode.value) return null;
    return comparePlans(compareTarget.value);
});

function generateStylesForLesson(lessons: number[]) {
    // Using indicies [0] and [-1] does not work in JS
    return { "--start": lessons.at(0), "--end": lessons.at(-1) };
}

const AFTERNOON_LESSONS_START = 8;
const weekSpecificPlan = computed(() => {
    // This has to be referenced for Vue to recompute this value if the selection changes
    selectedWeekType.value;
    if (!selectedPlan.value) return null;
    if (selectedWeekType.value === "all") return selectedPlan.value;
    const days = selectedPlan.value.days.map((day) => ({
        ...day,
        lessons: day.lessons
            .map(({ lessons, classes }) => ({
                lessons: fillLessonOnWeekType(lessons),
                classes
            }))
            .filter(({ lessons }) => lessons.length)
    }));
    return { ...selectedPlan.value, days };
});
function fillLessonOnWeekType(lessons: number[]) {
    if (lessons.length !== 1 || lessons[0] < AFTERNOON_LESSONS_START) return lessons;
    const lesson = lessons[0];
    const isCorrectWeek = selectedWeekType.value === (lesson % 2 === 0 ? "even" : "odd");
    if (!isCorrectWeek) return [];
    return selectedWeekType.value === "even" ? [lesson, lesson + 1] : [lesson - 1, lesson];
}
</script>

<style scoped>
#stundenplan {
    grid-template-columns: min-content repeat(5, 1fr);
    grid-template-rows: repeat(var(--lesson-count), auto);
}
#stundenplan.secret .day .lesson {
    animation: rgb infinite linear 10000ms;
}
.day {
    grid-template-rows: subgrid;
    grid-row: 1 / var(--lesson-count);
    .lesson {
        @apply rounded-md p-1 break-all border-solid border-[1px];
        /* 
            We add one to the end due to grid-row-end's rule
            + another one for our header
        */
        grid-row: calc(var(--start) + 1) / calc(var(--end) + 2);
        background: var(--even-lighter-white-gradient);
        --bg-opacity: 0.2;
    }
}
@keyframes rgb {
    0% {
        border-color: red;
        background: rgb(255 0 0 / var(--bg-opacity));
    }
    14.3% {
        border-color: orange;
        background: rgb(255 165 0 / var(--bg-opacity));
    }
    28.6% {
        border-color: yellow;
        background: rgb(255 255 0 / var(--bg-opacity));
    }
    42.9% {
        border-color: green;
        background: rgb(0 128 0 / var(--bg-opacity));
    }
    57.2% {
        border-color: blue;
        background: rgb(0 0 255 / var(--bg-opacity));
    }
    71.5% {
        border-color: purple;
        background: rgb(128 0 128 / var(--bg-opacity));
    }
    85.8% {
        border-color: magenta;
        background: rgb(255 0 255 / var(--bg-opacity));
    }
    100% {
        border-color: red;
        background: rgb(255 0 0 / var(--bg-opacity));
    }
}
.lesson {
    @apply place-content-center;
}
.days {
    grid-template-columns: min-content repeat(5, 1fr);
}
.lesson-list {
    grid-template-rows: subgrid;
    /* We start at row 2 to add our header to the top */
    grid-row: 2 / var(--lesson-count);
    .lesson {
        grid-column: 1;
    }
}
.lesson-list .lesson,
.day-label {
    @apply rounded-md;
    background: var(--light-white-gradient);
}
.subject[data-compare-type="removed"],
.update-old,
.lesson[data-compare-type="removed"] {
    @apply border-red-500 bg-red-500 line-through;
}
.subject[data-compare-type="new"],
.update-new,
.lesson[data-compare-type="added"] {
    @apply border-lime-500 bg-lime-500;
}
.subject[data-compare-type="removed"],
.subject[data-compare-type="new"],
.update-old,
.update-new,
.lesson[data-compare-type="removed"],
.lesson[data-compare-type="added"] {
    @apply bg-opacity-30 border-solid border-2 rounded-md;
}
.week {
    @apply rounded-full px-2;
    background-color: var(--color);
}
.week:not(.selected) {
    @apply opacity-30 scale-90 transition-all;
}
.week.selected {
    box-shadow: 0 0 15px 0 var(--color);
}
</style>
