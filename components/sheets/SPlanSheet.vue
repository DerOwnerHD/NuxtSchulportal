<template>
    <div class="relative">
        <h1>Stundenplan</h1>
        <ClientOnly>
            <font-awesome-icon 
                class="rounded-button absolute right-5 top-[-0.5rem] !p-2" 
                :icon="['fas', 'up-right-from-square']" 
                onclick="window.open('https://start.schulportal.hessen.de/stundenplan.php')">
            </font-awesome-icon>
        </ClientOnly>
        <button class="rounded-button absolute left-5 top-[-0.5rem] !p-2 w-8 h-8 grid place-content-center">
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'repeat']"></font-awesome-icon>
            </ClientOnly>
            <select class="absolute h-full w-full left-0 opacity-0" @change="updateSelectedPlan">
                <option v-for="(plan, index) of plans" :value="index">
                    Ab {{ startAndEndForDate(plan)[0] }}
                    <span v-if="startAndEndForDate(plan)[1] !== null">bis {{ startAndEndForDate(plan)[1] }}</span>
                </option>
            </select>
        </button>
        <div class="grid place-content-center py-2" v-if="!plans || !plans.length">
            <div class="error" v-if="appErrors.splan">
                <span>{{ appErrors.splan }}</span>
            </div>
            <div class="spinner" style="--size: 2rem" v-else></div>
        </div>
        <main id="sheet-inner-content" v-else>
            <small class="mt-[-0.5rem]">Ab {{ startAndEndDays[0] }}<span v-if="startAndEndDays[1] !== null"> bis {{ startAndEndDays[1] }}</span></small>
            <table class="text-white text-center w-[90vw] ml-[5vw] mt-2 overflow-auto block pb-2">
                <thead>
                    <tr>
                        <th v-for="cell of ['Std.', 'Mo', 'Di', 'Mi', 'Do', 'Fr']">{{ cell }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(row, index) of currentPlan.lessons">
                        <td>
                            <b>{{ index + 1 }}.</b>
                            <br>
                            <small style="line-height: 1; display: block; margin: 0.5rem 0;">
                                {{ row[0][0] }}:{{ row[0][1] }}
                                <br>-<br>
                                {{ row[1][0] }}:{{ row[1][1] }}
                            </small>
                        </td>
                        <td v-for="n in 5" 
                            :class="getSpanForLessonAndDay(n - 1, index + 1)?.lessons[0] !== index + 1 ? 'hidden' : ''" 
                            :rowspan="getSpanForLessonAndDay(n - 1, index + 1)?.lessons.length">
                            <div class="lesson" v-for="lesson of currentPlan.days[n - 1].lessons.find((x) => x.lessons[0] === index + 1)?.classes">
                                <b>{{ lesson.name }}</b>
                                <br>
                                <small>{{ lesson.room }}</small>
                                <br>
                                <small>{{ lesson.teacher }}</small>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </main>
    </div>
</template>

<script lang="ts">
export default defineComponent({
    name: "SPlanSheet",
    emits: ["close"],
    async mounted() {
        await useWait(1000);
        if (!this.plans || !this.plans.length) return;
        const table = this.$el.querySelector("table");
        table.style.height = `${Math.floor(window.innerHeight - table.getBoundingClientRect().top)}px`;
    },
    data() {
        return {
            appErrors: useAppErrors(),
            plans: useState<Stundenplan[]>("splan"),
            months: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
            selected: 0
        };
    },
    computed: {
        currentPlan() {
            return this.plansMergedLessons[this.selected];
        },
        startAndEndDays() {
            const start = new Date(this.currentPlan.start_date);
            const end = new Date(this.currentPlan.end_date || "");
            return [start, end].map((date) => (isNaN(date.getTime()) ? null : `${date.getDate()}. ${this.months[date.getMonth()]}`));
        },
        plansMergedLessons() {
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

                        return { ...day, lessons: lessons.reverse() };

                    })
                }
            });
        }
    },
    methods: {
        getSpanForLessonAndDay(day: number, lesson: number) {
            return this.currentPlan.days[day].lessons.find((x) => x.lessons.includes(lesson));
        },
        startAndEndForDate(plan: Stundenplan) {

            const start = new Date(plan.start_date);
            const end = new Date(plan.end_date || "");

            return [start, end].map((date) => (isNaN(date.getTime()) ? null : `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`));
            
        },
        updateSelectedPlan(event: Event) {

            if (!(event.target instanceof HTMLSelectElement)) return;
            this.selected = parseInt(event.target.value);

            const table = this.$el.querySelector("table");
            table.style.height = `${Math.floor(window.innerHeight - table.getBoundingClientRect().top)}px`;

        }
    }
});
</script>

<style scoped>
td, th {
    border: solid 1px #636363;
}
th {
    width: calc(100% / 6);
}
.lesson:not(:first-child) {
    border-top: solid 3px #dddddd;
    @apply mx-1 py-1.5;
}
.lesson:first-child {
    @apply py-1.5;
}
</style>