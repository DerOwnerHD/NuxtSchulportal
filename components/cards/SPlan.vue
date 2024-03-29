<template>
    <main v-if="cards.includes('splan')">
        <GradientBorder class="mb-2 rounded-2xl w-[90%] mx-[5%] z-0 max-w-[18rem]">
            <div class="grid place-content-center py-2" v-if="!plans || !plans.length">
                <div class="error" v-if="errors.splan">
                    <span>{{ errors.splan }}</span>
                </div>
                <div class="py-1.5 placeholder" v-else>
                    <div class="flex justify-center" excluded>
                        <p class="w-28"></p>
                    </div>
                    <div class="flex mt-2" excluded>
                        <div id="lessons-placeholder" class="mx-3" excluded>
                            <p class="w-8 mt-2" v-for="n in 4"></p>
                        </div>
                        <div id="classes-placeholder" class="pl-3 mr-3" excluded>
                            <p class="w-36 mt-2" v-for="n in 4"></p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="py-1.5" v-else>
                <p class="text-center" id="splan-date">
                    <b>{{ DAYS[currentOrSelectedDayIndex].substring(0, 2) }}</b
                    ><small
                        >, der
                        <span id="splan-date-dow"
                            >{{ new Date(nextOccuringSelectedDay).getDate() }}. {{ MONTHS[new Date(nextOccuringSelectedDay).getMonth()] }}</span
                        ></small
                    >
                    <span class="bg-[#4e5760] rounded-full ml-2 px-1.5 text-sm py-0.5" v-if="selectedDayRelative !== null">
                        {{ selectedDayRelative }}
                    </span>
                </p>
                <div class="flex">
                    <div id="lessons">
                        <p v-for="lesson of getSelectedDay.lessons" class="opacity-0">
                            {{ lesson.lessons.join(" - ") }}
                        </p>
                    </div>
                    <div id="classes">
                        <p v-for="lesson of getSelectedDay.lessons" class="opacity-0">
                            <span v-if="!lesson.classes.length">-</span>
                            <span v-for="cls of lesson.classes">
                                <b>{{ cls.name }}</b>
                                <small v-if="lesson.classes.length === 1">
                                    in <b>{{ cls.room }}</b> bei <b>{{ cls.teacher }}</b>
                                </small>
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </GradientBorder>
        <p class="card-main-description" v-if="plans && plans.length">
            Ab {{ startAndEndDays[0] }}<span v-if="startAndEndDays[1] !== null"> bis {{ startAndEndDays[1] }}</span>
        </p>
    </main>
    <footer>
        <button @click="useOpenSheet('splan', true)">
            <font-awesome-icon :icon="['fas', 'chevron-down']"></font-awesome-icon>
            <span>Ganzer Plan</span>
        </button>
        <button class="relative">
            <font-awesome-icon :icon="['fas', 'repeat']"></font-awesome-icon>
            <span>Wechseln</span>
            <select class="absolute h-full w-full left-0 opacity-0" @change="updateDaySelection" v-if="plans != null">
                <option v-for="(day, index) of DAYS" :value="index" :selected="index === currentOrSelectedDayIndex ? true : false">{{ day }}</option>
            </select>
        </button>
    </footer>
</template>

<script setup lang="ts">
const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const cards = useOpenCards();
const plans = useStundenplan();
const selected = ref(-1);
const day = ref(-1);
const errors = useAppErrors();

onMounted(() => fadeIn());

const plansWithMergedLessons = computed(() => {
    // @ts-ignore
    if (!plans.value.length) return [];
    // If we do not make this deep copy, the splan useState hook
    // would get overwritten with this data (which would break all
    // other stuff and in case of a hot reload during development
    // would cause lessons to be repeated (no no gud)
    const clonedPlans: Stundenplan[] = JSON.parse(JSON.stringify(plans.value));
    return clonedPlans.map((plan) => {
        return {
            ...plan,
            days: plan.days.map((day) => {
                const lessons: StundenplanLesson[] = [];
                for (let i = day.lessons.length - 1; i >= 0; i--) {
                    const lesson = day.lessons[i];
                    if (!lesson || i === 0) {
                        lessons.push(lesson);
                        continue;
                    }

                    const previous = day.lessons[i - 1];

                    if (JSON.stringify(lesson.classes) !== JSON.stringify(previous.classes)) lessons.push(lesson);
                    else day.lessons[i - 1].lessons = [...previous.lessons, ...lesson.lessons];
                }

                // If the last merged lessons of the day are empty,
                // we can remove them from the array to not show them anymore
                if (!lessons[0].classes.length) lessons.splice(0, 1);

                return { ...day, lessons: lessons.reverse() };
            })
        };
    });
});
const nextOccuringSelectedDay = computed(() => {
    if (!plans.value.length) return 0;
    const now = new Date();
    const next = new Date();
    const dow = now.getDay();

    const mondayOrSelectedDay = day.value !== -1 ? day.value + 1 : 1;

    if ([0, 6].includes(dow)) next.setDate(now.getDate() + ((mondayOrSelectedDay + 7 - dow) % 7));
    else if (now.getHours() >= 18 && day.value === -1) next.setDate(dow === 5 ? now.getDate() + ((1 + 7 - dow) % 7) : now.getDate() + 1);
    else if (dow > 0 && dow < 6)
        next.setDate(now.getDate() + (((day.value !== -1 ? day.value + 1 : dow) + (dow > day.value + 1 && day.value !== -1 ? 7 : 0) - dow) % 7));

    // This means the day we would show on the plan would
    // already be outdated, so if a new plan would begin
    // next monday, but we show the current plan which is
    // only for this week, we would show wrong data
    if (plans.value[0].end_date && next > new Date(plans.value[0].end_date)) selected.value = 1;
    else selected.value = -1;

    return next.getTime();
});
const getSelectedDay = computed(() => {
    if (!plans.value.length) return { lessons: [], name: "Montag" };
    if (selected.value !== -1) return plansWithMergedLessons.value[selected.value].days[currentOrSelectedDayIndex.value];
    return (plansWithMergedLessons.value.find((x) => x.current) || plansWithMergedLessons.value[0]).days[currentOrSelectedDayIndex.value];
});
const currentOrSelectedDayIndex = computed(() => (day.value !== -1 ? day.value : new Date(nextOccuringSelectedDay.value).getDay() - 1));
const selectedDayRelative = computed(() => {
    if (!plans.value.length) return null;
    const check = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    const now = new Date();
    const next = new Date(nextOccuringSelectedDay.value);

    if (check(now, next)) return "heute";

    // If it is not today, then we might check
    // if the date selected or automagically
    // choosen is tomorrow or not
    now.setDate(now.getDate() + 1);
    if (check(now, next)) return "morgen";

    return null;
});
const currentPlan = computed(() => {
    if (selected.value !== -1) return plans.value[selected.value];
    return plans.value.find((x) => x.current) || plans.value[0];
});
const startAndEndDays = computed(() => {
    const start = new Date(currentPlan.value.start_date);
    const end = new Date(currentPlan.value.end_date || "");
    return [start, end].map((date) => (isNaN(date.getTime()) ? null : `${date.getDate()}. ${MONTHS[date.getMonth()]}`));
});

function updateDaySelection(event: Event) {
    if (!event.target || !(event.target instanceof HTMLSelectElement)) return;
    function setInvisible(element: Element) {
        if (!(element instanceof HTMLElement)) return;
        element.style.opacity = "0";
    }
    document.querySelectorAll("article[card=splan] #lessons p").forEach(setInvisible);
    document.querySelectorAll("article[card=splan] #classes p").forEach(setInvisible);
    fadeIn();
    day.value = parseInt(event.target.value);
}

async function fadeIn() {
    if (!cards.value.includes("splan") || !Array.isArray(plans.value)) return;
    async function fadeInElement(element: Element, index: number) {
        if (!(element instanceof HTMLElement)) return;
        await useWait(index * 60);
        // We cannot just use fill forwards as that would break when updating the
        // opacity when switching to another day (you can't set it to 0 then)
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
    document.querySelectorAll("article[card=splan] #lessons p").forEach(fadeInElement);
    document.querySelectorAll("article[card=splan] #classes p").forEach(fadeInElement);
}

watch(cards, (value, old) => {
    if (value.includes("splan") && !old.includes("splan")) fadeIn();
});
watch(plans, () => fadeIn());
</script>

<style scoped>
#classes {
    @apply pl-3 mr-3 overflow-hidden;
    border-left: solid 1px;
    --gradient-border-degrees: 0deg;
    border-image: var(--white-gradient-border-image-zero);
    max-width: 70%;
    span:not(:first-child)::before {
        content: " | ";
    }
}
#lessons {
    @apply mx-3 text-center;
}
.placeholder {
    p {
        @apply h-4 rounded-full;
    }
}
p {
    white-space: nowrap;
}
</style>
