<template>
    <main v-if="cardsOpen.includes('splan')">
        <div class="mb-2 relative rounded-2xl w-[90%] mx-[5%] z-0 gradient-border max-w-[18rem]">
            <div class="grid place-content-center py-2" v-if="!plans || !plans.length">
                <div class="error" v-if="appErrors.splan">
                    <span>{{ appErrors.splan }}</span>
                </div>
                <div class="spinner" style="--size: 2rem" v-else></div>
            </div>
            <div class="py-1.5" v-else>
                <p class="text-center" id="splan-date">
                    <b>{{ days[currentOrSelectedDayIndex].substring(0, 2) }}</b
                    ><small
                        >, der
                        <span id="splan-date-dow"
                            >{{ new Date(nextOccuringSelectedDay).getDate() }}. {{ months[new Date(nextOccuringSelectedDay).getMonth()] }}</span
                        ></small
                    >
                    <span class="bg-[#4e5760] rounded-full ml-2 px-1.5 text-sm py-0.5" v-if="selectedDayRelative !== null">
                        {{ selectedDayRelative }}
                    </span>
                </p>
                <div class="flex">
                    <div id="lessons" class="text-center mx-3">
                        <p v-for="lesson of getSelectedDay.lessons">
                            {{ lesson.lessons.join(" - ") }}
                        </p>
                    </div>
                    <div id="classes" class="pl-3 mr-3 overflow-hidden">
                        <p v-for="lesson of getSelectedDay.lessons">
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
        </div>
        <p class="card-main-description" v-if="plans && plans.length">
            Ab {{ startAndEndDays[0] }}<span v-if="startAndEndDays[1] !== null"> bis {{ startAndEndDays[1] }}</span>
        </p>
    </main>
    <footer>
        <button @click="useSheet('splan', true)">
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'chevron-down']"></font-awesome-icon>
            </ClientOnly>
            <span>Ganzer Plan</span>
        </button>
        <button class="relative">
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'repeat']"></font-awesome-icon>
            </ClientOnly>
            <span>Wechseln</span>
            <select class="absolute h-full w-full left-0 opacity-0" @change="updateDaySelection">
                <option v-for="(day, index) of days" :value="index" :selected="index + 1 === new Date().getDay() ? true : false">{{ day }}</option>
            </select>
        </button>
    </footer>
</template>

<script lang="ts">
export default defineComponent({
    name: "SPlan",
    data() {
        return {
            cardsOpen: useState<Array<string>>("cards-open"),
            plans: useState<Stundenplan[]>("splan"),
            appErrors: useAppErrors(),
            days: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"],
            months: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
            selected: -1,
            day: -1
        };
    },
    computed: {
        plansMergedLessons() {
            // If we do not make this deep copy, the splan useState hook
            // would get overwritten with this data (which would break all
            // other stuff and in case of a hot reload during development
            // would cause lessons to be repeated (no no gud)
            const plans: Stundenplan[] = JSON.parse(JSON.stringify(this.plans));
            return plans.map((plan) => {
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
        },
        currentOrSelectedDayIndex() {
            return this.day !== -1 ? this.day : new Date(this.nextOccuringSelectedDay).getDay() - 1;
        },
        getSelectedDay() {
            if (this.selected !== -1) return this.plansMergedLessons[this.selected].days[this.currentOrSelectedDayIndex];
            return (this.plansMergedLessons.find((x) => x.current) || this.plansMergedLessons[0]).days[this.currentOrSelectedDayIndex];
        },
        nextOccuringSelectedDay(): number {
            const now = new Date();
            const next = new Date();
            const dow = now.getDay();

            const mondayOrSelectedDay = this.day !== -1 ? this.day + 1 : 1;

            if ([0, 6].includes(dow)) next.setDate(now.getDate() + ((mondayOrSelectedDay + 7 - dow) % 7));
            else if (now.getHours() >= 18 && this.day === -1) next.setDate(dow === 5 ? now.getDate() + ((1 + 7 - dow) % 7) : now.getDate() + 1);
            else if (dow > 0 && dow < 6)
                next.setDate(now.getDate() + (((this.day !== -1 ? this.day + 1 : dow) + (dow > this.day + 1 && this.day !== -1 ? 7 : 0) - dow) % 7));

            // This means the day we would show on the plan would
            // already be outdated, so if a new plan would begin
            // next monday, but we show the current plan which is
            // only for this week, we would show wrong data
            if (this.plans[0].end_date && next > new Date(this.plans[0].end_date)) this.selected = 1;
            else this.selected = -1;

            return next.getTime();
        },
        startAndEndDays() {
            const start = new Date(this.currentPlan.start_date);
            const end = new Date(this.currentPlan.end_date || "");
            return [start, end].map((date) => (isNaN(date.getTime()) ? null : `${date.getDate()}. ${this.months[date.getMonth()]}`));
        },
        currentPlan() {
            if (this.selected !== -1) return this.plans[this.selected];
            return this.plans.find((x) => x.current) || this.plans[0];
        },
        selectedDayRelative() {
            const check = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

            const now = new Date();
            const next = new Date(this.nextOccuringSelectedDay);

            if (check(now, next)) return "heute";

            // If it is not today, then we might check
            // if the date selected or automagically
            // choosen is tomorrow or not
            now.setDate(now.getDate() + 1);
            if (check(now, next)) return "morgen";

            return null;
        }
    },
    methods: {
        updateDaySelection(event: Event) {
            if (!event.target || !(event.target instanceof HTMLSelectElement)) return;
            this.day = parseInt(event.target.value);
        }
    }
});
</script>

<style scoped>
#classes {
    border-left: solid 1px;
    border-image: linear-gradient(#00000000 0%, #ffffff 50%, #00000000 100%) 1;
    max-width: 70%;
    span:not(:first-child)::before {
        content: " | ";
    }
}
p {
    white-space: nowrap;
}
</style>
