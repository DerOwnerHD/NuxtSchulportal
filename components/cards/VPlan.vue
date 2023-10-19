<template>
    <main v-if="cardsOpen.includes('vplan')">
        <div id="table" class="w-[90%] mx-[5%] rounded-2xl mb-2 text-white shadow-md z-0 relative gradient-border">
            <div class="grid place-content-center py-2" v-if="!plan">
                <div class="error" v-if="appErrors.vplan">
                    <span>{{ appErrors.vplan }}</span>
                </div>
                <div class="placeholder flex justify-evenly" v-else>
                    <div excluded v-for="n in 2">
                        <p></p>
                        <p class="mt-2"></p>
                        <p class="mt-1"></p>
                    </div>
                </div>
            </div>
            <div class="flex rounded-[inherit] py-2 px-1 justify-evenly" v-else>
                <p v-if="!plan.days.length">Keine Tage verfügbar</p>
                <div v-for="(day, index) of plan.days">
                    <header class="leading-3 my-1">
                        {{ day.day_of_week.substring(0, 2) }}<small>, {{ datesForDays[index].day }}. {{ datesForDays[index].month }}</small>
                    </header>
                    <main>
                        <p v-if="!day.vertretungen.length">Keine Vertretungen</p>
                        <ul v-else>
                            <li
                                v-for="{ lessons, subject, subject_old, substitute, teacher, room, note } of day.vertretungen.slice(
                                    0,
                                    day.vertretungen.length > 2 ? 2 : 3
                                )"
                                class="opacity-0">
                                <span>[{{ lessons.from + (lessons.to ? "-" + lessons.to : "") }}] </span>
                                <span v-if="!substitute && !subject"> Ausfall in </span>
                                <b>{{ subject || subject_old }}</b>
                                <span v-if="substitute || (substitute && teacher && teacher.replace(/<\/?del>/gi, '') !== substitute)">
                                    bei <b>{{ substitute || teacher?.replace(/<\/?del>/gi, "") }}</b></span
                                >
                                <span v-if="room"> in {{ room }}</span>
                                <span v-if="note"> ({{ note }})</span>
                            </li>
                            <li v-if="day.vertretungen.length > 3" class="opacity-0">
                                {{ day.vertretungen.length - 2 }} weitere Vertretung{{ day.vertretungen.length > 3 ? "en" : "" }}
                            </li>
                        </ul>
                    </main>
                </div>
            </div>
        </div>
        <p v-if="plan != null" class="card-main-description">Aktualisert vor {{ distanceToLastUpdated }}</p>
    </main>
    <footer>
        <button @click="useOpenSheet('vplan', true)">
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'chevron-down']"></font-awesome-icon>
            </ClientOnly>
            <span>Details</span>
        </button>
        <button @click="refreshPlan(false)">
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'arrow-rotate-right']"></font-awesome-icon>
            </ClientOnly>
            <span>Neu laden</span>
        </button>
    </footer>
</template>

<script lang="ts">
import { INFO_DIALOGS } from "~/composables/utils";
export default defineComponent({
    name: "VPlan",
    data() {
        return {
            months: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
            cardsOpen: useState<Array<string>>("cards-open"),
            plan: useState<Vertretungsplan>("vplan"),
            appErrors: useAppErrors()
        };
    },
    computed: {
        datesForDays() {
            if (!this.plan?.days) return [];
            return this.plan.days.map((day) => {
                const time = new Date(day.date);
                return { day: time.getDate(), month: this.months[time.getMonth()] };
            });
        },
        distanceToLastUpdated() {
            if (this.plan.last_updated === null) return "<unbekannt>";

            const now = new Date();
            const lastUpdated = new Date(this.plan.last_updated);

            const steps = [1000, 60, 60, 24];
            const difference = now.getTime() - lastUpdated.getTime();

            let iterator = 0;
            for (const step of ["Sekunde", "Minute", "Stunde"]) {
                const multiplier = steps.slice(0, iterator + 1).reduce((acc, value) => acc * value, 1);
                if (difference < multiplier * steps[iterator + 1]) {
                    const number = Math.floor(difference / multiplier);
                    return `${number} ${step}${number !== 1 ? "n" : ""}`;
                }

                iterator++;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            return `${days} Tag${days !== 1 ? "en" : ""}`;
        }
    },
    props: {
        extended: { type: Boolean, required: true }
    },
    methods: {
        async refreshPlan(bypass: boolean): Promise<any> {
            if (useState("vplan").value == null && !useAppErrors().value.vplan && !bypass) return;
            useState("vplan").value = null;
            useAppErrors().value.vplan = null;
            const plan = await useVplan();

            if (plan === "401: Unauthorized") {
                const login = await useLogin(false);
                if (login) {
                    await this.refreshPlan(true);
                    await useWait(500);
                    return (useInfoDialog().value = { ...INFO_DIALOGS.AUTOMATIC_LOGIN, details: `Token: ${useToken().value}` });
                }

                await useWait(500);

                useInfoDialog().value = INFO_DIALOGS.AUTOMATIC_LOGIN_ERROR;
            }

            if (typeof plan === "string") return (useAppErrors().value.vplan = plan);
            useState("vplan").value = plan;
            useAppNews().value.vplan = plan.days.reduce((acc, day) => (acc += day.vertretungen.length), 0);
        },
        async fadeIn() {
            if (!this.extended || !Array.isArray(this.plan?.days) || !this.plan?.days?.length) return;
            async function fadeInElement(element: Element, index: number) {
                if (!(element instanceof HTMLElement)) return;
                await useWait(index * 60);
                element.animate(
                    [
                        { opacity: 0, transform: "scale(90%)" },
                        { opacity: 1, transform: "scale(100%)" }
                    ],
                    { duration: 400, fill: "forwards" }
                );
            }
            await useWait(10);
            // If we don't do it for each day seperatly, it would go through the first
            // day and only THEN start fading in the lessons of the second day
            document.querySelectorAll("article[card=vplan] #table ul").forEach((list) => list.querySelectorAll("li").forEach(fadeInElement));
        }
    },
    watch: {
        plan() {
            this.fadeIn();
        },
        extended() {
            this.fadeIn();
        }
    }
});
</script>

<style scoped>
.placeholder {
    div {
        @apply w-[50%] justify-center grid;
        p {
            @apply w-20 h-4 rounded-full;
        }
        p:not(:first-child) {
            @apply w-32;
        }
    }
    div:last-child {
        @apply ml-2;
    }
}
#table {
    > div > div {
        min-width: 45%;
        @apply px-1;
        header {
            text-align: center;
        }
        main {
            @apply px-1;
            font-size: 0.8rem;
            p {
                text-align: center;
            }
            li {
                list-style: disc inside;
                line-break: loose;
                margin-left: 1rem;
                font-size: 0.75rem;
            }
        }
    }
    > div > div:not(:first-child) {
        border-left: solid 1px;
        border-image: linear-gradient(#00000000 0%, #ffffff 50%, #00000000 100%) 1;
    }
}
small {
    font-weight: 100;
}
#table::before {
    @apply z-[-1] m-[-3px] bottom-0 top-0 left-0 right-0 absolute drop-shadow-xl rounded-[inherit] content-[""];
    background: var(--gradient);
}
</style>
