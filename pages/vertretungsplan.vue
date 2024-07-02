<template>
    <div class="h-full py-8">
        <ErrorDisplay
            :error="errors.get(AppID.Vertretungsplan)"
            :retryFunction="fetchVertretungsplan"
            v-if="errors.has(AppID.Vertretungsplan)"></ErrorDisplay>
        <div v-else-if="vertretungsplan" class="container h-full grid gap-2 place-content-center justify-items-center">
            <main v-if="vertretungsplan.days.length">
                <DeckCard class="vplan-card h-full blurred-background" v-if="selectedDay" :colors="['#425849', '#1e2921']">
                    <div class="inner grid h-full" ref="card">
                        <main v-if="showCardContent">
                            <div v-if="selectedDay.vertretungen.length" class="grid gap-2">
                                <div
                                    class="blurred-background p-2 rounded-lg w-full !border-none shadow-md flex gap-2 items-center hover:active:scale-95 transition-transform"
                                    v-for="{ lessons, subject, subject_old, substitute, teacher, room, note } of selectedDay.vertretungen">
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
                            <div v-if="selectedDay.news.length" class="blurred-background p-2 rounded-lg !border-none shadow-md my-2">
                                <h1 class="flex gap-2 justify-center w-full items-center">
                                    <font-awesome-icon :icon="['fas', 'newspaper']"></font-awesome-icon>
                                    Neuigkeiten
                                </h1>
                                <PrettyWrap v-for="item of selectedDay.news">
                                    <span v-html="item"></span>
                                </PrettyWrap>
                            </div>
                        </main>
                        <footer class="flex justify-center items-center gap-2 self-end" v-if="showCardContent">
                            <font-awesome-icon :icon="['fas', 'clock']"></font-awesome-icon>
                            <span>Aktualisert vor {{ distanceToLastUpdated }}</span>
                        </footer>
                    </div>
                </DeckCard>
            </main>
            <section v-else class="grid gap-2 place-content-center">
                <p>Keine Tage verfügbar</p>
                <ButtonRoundedBlurred text="Neu laden" :icon="['fas', 'arrow-rotate-right']" @click="fetchVertretungsplan"></ButtonRoundedBlurred>
            </section>
            <footer v-if="vertretungsplan.days.length" class="blurred-background rounded-full w-fit p-2">
                <FluidButtonGroup>
                    <FluidQuickSwitch :options="planSelectionOptions" @update="switchDay"></FluidQuickSwitch>
                    <FluidButton class="text-2xl" :icon="['fas', 'arrow-rotate-right']" @click="fetchVertretungsplan"></FluidButton>
                </FluidButtonGroup>
            </footer>
        </div>
        <div v-else class="h-full w-screen grid place-content-center">
            <InfiniteSpinner :size="50"></InfiniteSpinner>
        </div>
    </div>
</template>

<script setup lang="ts">
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
async function switchDay(index: number) {
    const card = document.querySelector(".vplan-card");
    if (card === null) return (selected.value = index);
    card.animate({ opacity: "0" }, { duration: 300, fill: "forwards", easing: "ease-in" });
    await useWait(300);
    selected.value = index;
    await nextTick();
    resizeCard();
    card.animate({ opacity: "1" }, { duration: 300, fill: "forwards", easing: "ease-out" });
}
const planSelectionOptions = computed(() =>
    vertretungsplan.value?.days.map((day) => {
        return {
            title: day.day_of_week.substring(0, 2) + ".",
            subtitle: relativeOrAbsoluteDateFormat(day.date, "day-month-short"),
            widget: day.vertretungen.length
        };
    })
);
const selected = ref(0);
const selectedDay = computed(() => vertretungsplan.value?.days[selected.value]);
const vertretungsplan = useVertretungsplan();
onMounted(() => {
    continuousUpdate();
    resizeCard();
    window.addEventListener("resize", resizeCard);
});
onBeforeUnmount(() => {
    // This may not be strictly neccesary, but to just
    // have some nice clean up of our mess we do this
    clearInterval(distanceInterval);
    window.removeEventListener("resize", resizeCard);
});
watch(vertretungsplan, () => {
    clearInterval(distanceInterval);
    resizeCard();
    selected.value = 0;
    continuousUpdate();
});

// This is used to set the size for the card. It is supposed to prevent
// the card from causing the whole thing from overflowing on the y axis.
// On this screen, the user shouldn't have to scroll the page itself, only
// inside the card. Surely, there might be a better way to do this but may
// require some rework (also needs to be done for /mylessons/[id]
const card = ref<HTMLElement | null>(null);
const showCardContent = ref(false);
async function resizeCard() {
    if (card.value === null) return;
    showCardContent.value = false;
    card.value.style.height = "";
    await nextTick();
    card.value.style.height = card.value.clientHeight + "px";
    showCardContent.value = true;
}
watch(card, (value) => {
    // On mounted, the component may not yet be ready, so we also add this
    if (value !== null) resizeCard();
});
</script>

<style scoped>
.container {
    grid-template-rows: 1fr min-content;
}
</style>
