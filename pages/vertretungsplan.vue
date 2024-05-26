<template>
    <div class="h-full py-8">
        <ErrorDisplay
            :error="errors.get(AppID.Vertretungsplan)"
            :retryFunction="fetchVertretungsplan"
            v-if="errors.has(AppID.Vertretungsplan)"></ErrorDisplay>
        <div v-else-if="vertretungsplan" class="relative grid place-content-center w-screen max-w-[100vw] h-full">
            <DeckCard class="vplan-card backdrop-blur-lg absolute" v-for="day of vertretungsplan.days" :colors="['#425849', '#1e2921']">
                <div class="inner grid h-full mb-2">
                    <header class="justify-between flex">
                        <h1>
                            <b>{{ day.day_of_week }}</b>
                            <span class="text-xs" v-if="day.relative"> , {{ day.relative }} </span>
                            <span class="text-xs" v-else> , der {{ convertDateStringToFormat(day.date, "day-month-short") }} </span>
                        </h1>
                        <div class="flex gap-2">
                            <ButtonRoundedBlurred
                                v-if="vertretungsplan.days.length > 1"
                                @click="switchDay"
                                :icon="['fas', 'repeat']"></ButtonRoundedBlurred>
                            <ButtonRoundedBlurred :icon="['fas', 'arrow-rotate-right']" @click="fetchVertretungsplan"></ButtonRoundedBlurred>
                        </div>
                    </header>
                    <main class="py-2">
                        <div v-if="day.vertretungen.length" class="grid gap-2">
                            <div
                                class="blurred-background p-2 rounded-lg w-full !border-none shadow-md flex gap-2 items-center hover:active:scale-95 transition-transform"
                                v-for="{ lessons, subject, subject_old, substitute, teacher, room, note } of day.vertretungen">
                                <span class="blurred-background !border-none shadow-sm px-2 py-1 rounded-full">{{
                                    lessons.list.length > 1 ? lessons.from + " - " + lessons.to : lessons.from
                                }}</span>
                                <div class="grid">
                                    <div class="flex gap-1 items-center">
                                        <span class="text-sm" v-if="!substitute && !subject">Ausfall in</span>
                                        <span class="font-bold">{{ subject ?? subject_old }}</span>
                                        <span v-if="(substitute || teacher) && subject">
                                            <span class="text-sm">bei</span>
                                            {{ substitute || teacher }}
                                        </span>
                                        <span v-if="room">
                                            <span class="text-sm">in</span>
                                            {{ room }}
                                        </span>
                                    </div>
                                    <span class="text-xs" v-if="note">{{ note }}</span>
                                </div>
                            </div>
                        </div>
                        <p v-else class="text-center">Keine Vertretungen</p>
                        <div v-if="day.news.length" class="blurred-background p-2 rounded-lg !border-none shadow-md my-2">
                            <h1 class="flex gap-2 justify-center w-full items-center">
                                <font-awesome-icon :icon="['fas', 'newspaper']"></font-awesome-icon>
                                Neuigkeiten
                            </h1>
                            <ul>
                                <li v-for="item of day.news" class="list-disc ml-4">
                                    <PrettyWrap>
                                        <span v-html="item"></span>
                                    </PrettyWrap>
                                </li>
                            </ul>
                        </div>
                    </main>
                    <footer class="flex justify-center items-center gap-2 self-end">
                        <font-awesome-icon :icon="['fas', 'clock']"></font-awesome-icon>
                        <span>Aktualisert vor {{ distanceToLastUpdated }}</span>
                    </footer>
                </div>
            </DeckCard>
        </div>
        <div v-else class="h-full w-screen grid place-content-center">
            <InfiniteSpinner :size="50"></InfiniteSpinner>
        </div>
    </div>
</template>

<script setup lang="ts">
const isRunningAnimation = ref(false);
const errors = useAppErrors();
const distanceToLastUpdated = ref<string | null>(null);
let distanceInterval: NodeJS.Timeout;
function continuousUpdate() {
    if (!vertretungsplan.value) return;
    clearInterval(distanceInterval);
    if (!vertretungsplan.value?.last_updated) return (distanceToLastUpdated.value = "<unbekannt>");
    const difference = Date.now() - new Date(vertretungsplan.value.last_updated).getTime();
    // If it is already past more than an hour, there will
    // be no need of always updating it, as it would only do
    // so very rarely (thus we only compute it once at creation)
    distanceToLastUpdated.value = calculateDateDistance(new Date(vertretungsplan.value.last_updated).getTime(), true);
    if (difference > 1000 * 60 * 60) return;
    // @ts-ignore timeouts also work as numbers (the index of the timeout)
    distanceInterval = setInterval(
        () => {
            if (!vertretungsplan.value?.last_updated) return clearInterval(distanceInterval);
            // The distance will only get calculated inside this interval
            distanceToLastUpdated.value = calculateDateDistance(new Date(vertretungsplan.value.last_updated).getTime(), true);
            // If the difference is already larger than a minute, we
            // only run this every minute, else every second
        },
        1000 * (difference > 1000 * 60 ? 60 : 1)
    );
}
async function switchDay() {
    if (isRunningAnimation.value || !vertretungsplan.value.days) return;
    isRunningAnimation.value = true;
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".vplan-card"));

    const frontCard = cards[selectedDay.value];
    const backCard = cards[selectedDay.value === 1 ? 0 : 1];

    frontCard.style.transform = `translateX(${frontCard.clientWidth + 20}px) rotate(5deg)`;
    backCard.style.opacity = "1";
    backCard.style.transform = "rotate(0deg)";
    await useWait(200);

    frontCard.style.zIndex = "2";
    backCard.style.zIndex = "3";
    frontCard.style.opacity = "0.5";

    await useWait(200);

    frontCard.style.transform = "rotate(5deg)";

    selectedDay.value = selectedDay.value === 1 ? 0 : 1;
    await useWait(100);
    isRunningAnimation.value = false;
}

const selectedDay = ref(0);
const vertretungsplan = useVertretungsplan();
onMounted(() => {
    continuousUpdate();
});
onBeforeUnmount(() => {
    // This may not be strictly neccesary, but to just
    // have some nice clean up of our mess we do this
    clearInterval(distanceInterval);
});
watch(vertretungsplan, () => {
    clearInterval(distanceInterval);
    selectedDay.value = 0;
    continuousUpdate();
});
</script>

<style scoped>
.inner {
    grid-template-rows: min-content 1fr min-content;
}
.substitutions td {
    @apply p-1;
    border: solid 1px #ffffff50;
}
.deck-card {
    transition-timing-function: cubic-bezier(0.55, 0.42, 0.58, 0.99);
    transition-duration: 300ms;
    transition-property: transform opacity;
}
.deck-card:not(:first-child) {
    @apply top-0 opacity-50;
}
.deck-card:first-child {
    @apply z-[3];
    transform: rotate(0deg);
}
.deck-card:nth-child(2) {
    @apply z-[2];
    transform: rotate(5deg);
}
</style>
