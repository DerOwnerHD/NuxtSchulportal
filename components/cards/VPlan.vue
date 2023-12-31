<template>
    <main v-if="cards.includes('vplan')">
        <div id="table" class="w-[90%] mx-[5%] rounded-2xl mb-2 text-white shadow-md z-0 relative gradient-border">
            <div class="grid place-content-center py-2" v-if="!plan">
                <div class="error" v-if="errors.vplan">
                    <span>{{ errors.vplan }}</span>
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
                <p v-if="!plan.days.length" class="opacity-0">Keine Tage verfügbar</p>
                <div v-for="(day, index) of plan.days">
                    <header class="leading-3 my-1">
                        {{ day.day_of_week.substring(0, 2) }}<small>, {{ datesForDays[index].day }}. {{ datesForDays[index].month }}</small>
                    </header>
                    <main>
                        <p v-if="!day.vertretungen.length" class="opacity-0">Keine Vertretungen</p>
                        <ul v-else>
                            <li
                                v-for="{ lessons, subject, subject_old, substitute, teacher, room, note } of day.vertretungen.slice(
                                    0,
                                    day.vertretungen.length > 3 ? 2 : 3
                                )"
                                class="opacity-0">
                                <span>[{{ lessons.from + (lessons.to ? "-" + lessons.to : "") }}] </span>
                                <span v-if="!substitute && !subject"> Ausfall in </span>
                                <b>{{ subject || subject_old }}</b>
                                <span v-if="substitute && teacher && teacher.replace(/<\/?del>/gi, '') !== substitute">
                                    bei <b>{{ substitute || teacher?.replace(/<\/?del>/gi, "") }}</b></span
                                >
                                <span v-if="room"> in {{ room }}</span>
                                <span v-if="note"> ({{ note }})</span>
                            </li>
                            <li v-if="day.vertretungen.length > 3" class="opacity-0">Noch {{ day.vertretungen.length - 2 }} weitere...</li>
                        </ul>
                    </main>
                </div>
            </div>
        </div>
        <p v-if="plan != null" class="card-main-description">Aktualisert vor {{ distanceToLastUpdated }}</p>
    </main>
    <footer>
        <button @click="useOpenSheet('vplan', true)">
            <font-awesome-icon :icon="['fas', 'chevron-down']"></font-awesome-icon>
            <span>Details</span>
        </button>
        <button @click="refreshPlan(false)">
            <font-awesome-icon :icon="['fas', 'arrow-rotate-right']"></font-awesome-icon>
            <span>Neu laden</span>
        </button>
    </footer>
</template>

<script setup lang="ts">
const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const cards = ref(useOpenCards());
const plan = useState<Vertretungsplan>("vplan");
const errors = useAppErrors();
let distanceInterval: NodeJS.Timeout;

onMounted(() => {
    fadeIn();
    continuousUpdate();
});
const datesForDays = computed(() => {
    if (!plan.value?.days) return [];
    return plan.value.days.map((day) => {
        const time = new Date(day.date);
        return { day: time.getDate(), month: months[time.getMonth()] };
    });
});
const distanceToLastUpdated = ref<string | null>(null);

watch(plan, () => {
    fadeIn();
    continuousUpdate();
});
watch(cards, (value, old) => {
    if (value.includes("vplan") && !old.includes("vplan")) fadeIn();
});

function calculateDistance() {
    if (!plan.value?.last_updated) return "<unbekannt>";
    const steps = [1000, 60, 60, 24];
    const difference = Date.now() - new Date(plan.value.last_updated).getTime();
    let iterator = 0;
    for (const step of ["Sekunde", "Minute", "Stunde"]) {
        // This multiplies all steps before and including this current one
        // -> Refers to second, minute and hour
        const multiplier = steps.slice(0, iterator + 1).reduce((acc, value) => acc * value, 1);
        if (difference < multiplier * steps[iterator + 1]) {
            const number = Math.floor(difference / multiplier);
            return `${number} ${step}${number !== 1 ? "n" : ""}`;
        }
        iterator++;
    }
    // This is just a fallback if the thing has not been reloaded within the
    // last 24 hours (like on weekends) -> there shouldn't be 100 hours on the counter
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    return `${days} Tag${days !== 1 ? "en" : ""}`;
}
async function refreshPlan(bypass: boolean): Promise<any> {
    const nulledPlan = useState("vplan");
    // When the plan is ALREADY reloading and we aren't bypassing that
    // after a reauth, we shouldn't allow the user to retrigger the function
    if (nulledPlan.value == null && !useAppErrors().value.vplan && !bypass) return;
    // The plan just as well as errors messages get cleared
    nulledPlan.value = null;
    errors.value.vplan = null;
    const plan = await useVplan();
    // We can expect the session to have timeouted once this fires
    // Thus we can trigger a reauth (if that shouldn't work there ain't much to do)
    if (plan === "401: Unauthorized") {
        const login = await useLogin(false);
        if (login) {
            await refreshPlan(true);
            return (useInfoDialog().value = { ...infoDialogs.AUTOMATIC_LOGIN, details: `Token: ${useToken().value}` });
        }
        // Currently there might not be any logout procedure here
        // but may come in the future (we might reprompt the user for credentials)
        useInfoDialog().value = infoDialogs.AUTOMATIC_LOGIN_ERROR;
    }

    if (typeof plan === "string") return (useAppErrors().value.vplan = plan);
    useState("vplan").value = plan;
    useAppNews().value.vplan = plan.days.reduce((acc, day) => (acc += day.vertretungen.length), 0);
}

async function fadeIn() {
    if (!cards.value.includes("vplan") || !Array.isArray(plan.value?.days) || !plan.value?.days?.length) return;
    async function fadeInElement(element: Element, index: number) {
        if (!(element instanceof HTMLElement)) return;
        // They should be stacked after each other
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
    document.querySelectorAll("article[card=vplan] #table p").forEach(fadeInElement);
}

function continuousUpdate() {
    clearInterval(distanceInterval);
    if (!plan.value?.last_updated) return (distanceToLastUpdated.value = "<unbekannt>");
    const difference = Date.now() - new Date(plan.value.last_updated).getTime();
    // If it is already past more than an hour, there will
    // be no need of always updating it, as it would only do
    // so very rarely (thus we only compute it once at creation)
    distanceToLastUpdated.value = calculateDistance();
    if (difference > 1000 * 60 * 60) return;
    // @ts-ignore timeouts also work as numbers (the index of the timeout)
    distanceInterval = setInterval(
        () => {
            if (!plan.value?.last_updated) return clearInterval(distanceInterval);
            // The distance will only get calculated inside this interval
            distanceToLastUpdated.value = calculateDistance();
            // If the difference is already larger than a minute, we
            // only run this every minute, else every second
        },
        1000 * (difference > 1000 * 60 ? 60 : 1)
    );
}
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
