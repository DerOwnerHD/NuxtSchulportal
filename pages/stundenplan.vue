<template>
    <div class="h-full">
        <ErrorDisplay :error="errors.get(AppID.Stundenplan)" :retryFunction="fetchStundenplan" v-if="errors.has(AppID.Stundenplan)"></ErrorDisplay>
        <div class="my-2" v-else-if="plans && selectedPlan">
            <div class="blurred-background grid m-2 rounded-2xl place-content-center p-2 gap-2 text-center">
                <FluidButtonGroup>
                    <FluidSelection
                        id="splan-switcher"
                        :options="planSelectionOptions"
                        :show-amount="true"
                        @update="updateSelectedPlan"></FluidSelection>
                    <button class="flex items-center" @click="comparisonMode = !comparisonMode">
                        <div class="h-full flex gap-2 items-center hover:active:scale-95 hover:active:opacity-90 transition-all">
                            <font-awesome-icon :icon="['fas', 'code-compare']"></font-awesome-icon>
                            <div class="grid">
                                <span>Vergleichen</span>
                                <span class="text-xs">mit aktivem Plan</span>
                            </div>
                            <span
                                class="border-solid border-2 border-white rounded-full aspect-square h-8 grid place-content-center transition"
                                :class="{ 'bg-white': comparisonMode, 'text-black': comparisonMode }">
                                <font-awesome-icon :icon="['fas', 'check']"></font-awesome-icon>
                            </span>
                        </div>
                    </button>
                </FluidButtonGroup>
                <div class="text-balance">
                    <span> gültig ab dem {{ convertDateStringToFormat(selectedPlan.start_date, "day-month-full") }} </span>
                    <span v-if="selectedPlan.end_date"> bis zum {{ convertDateStringToFormat(selectedPlan.end_date, "day-month-full") }} </span>
                    <span v-if="selectedPlan.current"> (aktiv) </span>
                </div>
            </div>
            <div
                class="plan grid w-screen min-h-full text-center gap-2 px-2"
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
                <div class="day grid" v-for="(day, index) of selectedPlan.days" v-if="!comparisonMode">
                    <div class="day-label">{{ WEEKDAYS.short[index] }}</div>
                    <div
                        class="lesson rounded-md p-1 break-all"
                        v-for="lesson of day.lessons"
                        :style="{ '--start': lesson.lessons.at(0), '--end': lesson.lessons.at(-1) }">
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
                    <div
                        class="lesson rounded-md p-1 break-all"
                        :compare-type="lesson.type"
                        v-for="lesson of day"
                        :style="{ '--start': lesson.lessons.at(0), '--end': lesson.lessons.at(-1) }">
                        <div v-if="lesson.subjects.length" class="grid h-full items-center gap-2">
                            <div class="subject grid items-center" :compare-type="subject.type" v-for="subject of lesson.subjects">
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
        <div v-else class="h-full w-screen grid place-content-center">
            <InfiniteSpinner :size="50"></InfiniteSpinner>
        </div>
    </div>
</template>

<script setup lang="ts">
const plans = useStundenplan();
const errors = useAppErrors();
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

function navigateToSelectedPlan() {
    if (!plans.value) return;
    const planId = Array.isArray(route.query.plan) ? route.query.plan.at(0) : route.query.plan;
    if (!planId) return;
    const index = plans.value.findIndex((plan) => plan.start_date === planId);
    if (index === -1) return;
    selected.value = index;
}

function updateSelectedPlan(index: number) {
    selected.value = index;
}
const planSelectionOptions = computed(() => {
    if (!plans.value) return [];
    return plans.value.map((plan) => {
        return {
            title: `Ab ${convertDateStringToFormat(plan.start_date, "day-month-full", true)}${plan.current ? " (aktiv)" : ""}`,
            subtitle: plan.end_date ? `Bis ${convertDateStringToFormat(plan.end_date, "day-month-full", true)}` : "",
            id: plan.start_date
        };
    });
});
const comparisonMode = ref(false);
const compareTarget = computed(() => plans.value[selected.value]?.start_date);
const comparisonResult = computed(() => {
    if (!comparisonMode.value) return null;
    return comparePlans(compareTarget.value);
});
</script>

<style scoped>
.plan {
    grid-template-columns: min-content repeat(5, 1fr);
    grid-template-rows: repeat(var(--lesson-count), auto);
}
.plan.secret .day .lesson {
    animation: rgb infinite linear 10000ms;
}
.day {
    grid-template-rows: subgrid;
    grid-row: 1 / var(--lesson-count);
    .lesson {
        /* 
            We add one to the end due to grid-row-end's rule
            + another one for our header
        */
        grid-row: calc(var(--start) + 1) / calc(var(--end) + 2);
        border-width: 1px;
        border-style: solid;
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
.subject[compare-type="removed"],
.update-old,
.lesson[compare-type="removed"] {
    @apply border-red-500 bg-red-500 line-through;
}
.subject[compare-type="new"],
.update-new,
.lesson[compare-type="added"] {
    @apply border-lime-500 bg-lime-500;
}
.subject[compare-type="removed"],
.subject[compare-type="new"],
.update-old,
.update-new,
.lesson[compare-type="removed"],
.lesson[compare-type="added"] {
    @apply bg-opacity-30 border-solid border-2 rounded-md;
}
</style>
