<template>
    <main v-if="cardsOpen.includes('splan')">
        <div class="mb-2 relative rounded-2xl w-[90%] mx-[5%] z-0 gradient-border max-w-[18rem]">
            <div class="grid place-content-center py-2" v-if="!plans || !plans.length">
                <div class="error" v-if="appErrors.stundenplan">
                    <span>{{ appErrors.stundenplan }}</span>
                </div>
                <div class="spinner" style="--size: 2rem" v-else></div>
            </div>
            <div class="py-1.5" v-else>
                <p class="text-center" id="splan-date">
                    <b>{{ days[currentOrNextSchoolDay.getDay() - 1] }}</b
                    ><small
                        >, der
                        <span id="splan-date-dow"
                            >{{ currentOrNextSchoolDay.getDate() }}. {{ months[currentOrNextSchoolDay.getMonth()] }}</span
                        ></small
                    >
                </p>
                <div class="flex">
                    <div id="lessons" class="text-center mx-3">
                        <p v-for="lesson of plans[selected].days[currentOrNextSchoolDay.getDay()].lessons">
                            {{ lesson.lessons.join(" - ") }}
                        </p>
                    </div>
                    <div id="classes" class="pl-3 mr-3 overflow-hidden">
                        <p v-for="lesson of plans[selected].days[currentOrNextSchoolDay.getDay()].lessons">
                            <span v-if="!lesson.classes.length">-</span>
                            <span v-for="class_ of lesson.classes">
                                <b>{{ class_.name }}</b>
                                <small v-if="lesson.classes.length === 1">
                                    in <b>{{ class_.room }}</b> bei <b>{{ class_.teacher }}</b>
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
        <button>
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'chevron-down']"></font-awesome-icon>
            </ClientOnly>
            <span>Ganzer Plan</span>
        </button>
        <button>
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'repeat']"></font-awesome-icon>
            </ClientOnly>
            <span>Wechseln</span>
        </button>
    </footer>
</template>

<script lang="ts">
import { Stundenplan } from "~/composables/apps";
export default defineComponent({
    name: "SPlan",
    data() {
        return {
            cardsOpen: useState<Array<string>>("cards-open"),
            plans: useState<Stundenplan[]>("splan"),
            appErrors: useState<{ [app: string]: string | null }>("app-errors"),
            days: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"],
            months: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
            selected: 0
        };
    },
    computed: {
        currentOrNextSchoolDay(): Date {
            const time = new Date();
            const nextDay = new Date();
            const dow = time.getDay();
            if ([0, 6].includes(dow)) nextDay.setDate(time.getDate() + ((1 + 7 - time.getDay()) % 7));
            // Past 6pm, we will show the plan for the next day
            else if (time.getHours() >= 18) {
                nextDay.setDate(dow !== 5 ? time.getDate() + 1 : time.getDate() + ((1 + 7 - time.getDay()) % 7));
            }

            return nextDay;
        },
        startAndEndDays() {
            const start = new Date(this.plans[this.selected].start_date);
            const end = new Date(this.plans[this.selected].end_date || "");
            return [start, end].map((date) => (isNaN(date.getTime()) ? null : `${date.getDate()}. ${this.months[date.getMonth()]}`));
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
