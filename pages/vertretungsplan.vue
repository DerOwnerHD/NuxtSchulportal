<template>
    <div class="h-full py-8">
        <AppErrorDisplay :id="AppID.Vertretungsplan" v-if="hasAppError(AppID.Vertretungsplan)"></AppErrorDisplay>
        <div v-else-if="vertretungsplan" class="wrapper h-full grid gap-2 place-content-center justify-items-center">
            <main v-if="vertretungsplan.days.length" class="min-h-0">
                <DeckCard class="vplan-card h-full blurred-background" ref="card" v-if="vertretungsplan.days" :colors="['#425849', '#1e2921']">
                    <div class="grid" ref="content" v-if="selectedDay">
                        <div v-if="selectedDay.vertretungen.length" class="grid gap-2">
                            <div
                                class="blurred-background borderless p-2 rounded-lg w-full flex gap-2 items-center hover:active:scale-95 transition-transform"
                                v-for="{ lessons, subject, subject_old, substitute, teacher, room, note, type } of selectedDay.vertretungen">
                                <span class="blurred-background borderless whitespace-nowrap px-2 py-1 rounded-full">{{
                                    lessons.list.length > 1 ? lessons.from + " - " + lessons.to : lessons.from
                                }}</span>
                                <div class="grid">
                                    <p>
                                        <span class="text-sm" v-if="type">{{ type }} in </span>
                                        <span class="font-bold"> {{ subject ?? subject_old }} </span>
                                        <template v-if="room">
                                            <span class="text-sm"> in Raum </span>
                                            {{ room }}
                                        </template>
                                    </p>
                                    <span class="text-xs flex gap-1 items-center flex-wrap">
                                        <span v-html="teacher"></span>
                                        <font-awesome-icon :icon="['fas', 'long-arrow-right']"></font-awesome-icon>
                                        <span>{{ substitute ?? "Niemand" }}</span>
                                    </span>
                                    <span class="text-xs" v-if="note">{{ note }}</span>
                                </div>
                            </div>
                        </div>
                        <p v-else class="text-center">Keine Vertretungen</p>
                        <div v-if="selectedDay.news.length" class="blurred-background borderless p-2 rounded-lg my-2">
                            <h1 class="flex gap-2 justify-center w-full items-center">
                                <font-awesome-icon :icon="['fas', 'newspaper']"></font-awesome-icon>
                                Ankündigungen
                            </h1>
                            <PrettyWrap v-for="item of selectedDay.news">
                                <span v-html="item"></span>
                            </PrettyWrap>
                        </div>
                    </div>
                </DeckCard>
            </main>
            <section v-else class="grid gap-2 place-content-center">
                <p>Keine Tage verfügbar</p>
                <ButtonRoundedBlurred :icon="['fas', 'arrow-rotate-right']" @click="fetchVertretungsplan">Neu laden</ButtonRoundedBlurred>
            </section>
            <section class="flex justify-center hover:active:scale-95 transition-transform" @click="useRelativeDistance = !useRelativeDistance">
                <div class="blurred-background px-4 rounded-full py-1 flex gap-2 items-center">
                    <font-awesome-icon :icon="['fas', 'clock']"></font-awesome-icon>
                    <span v-if="vertretungsplan.last_updated">
                        Aktualisert
                        {{
                            useRelativeDistance
                                ? `vor ${distanceToLastUpdated}`
                                : `am ${convertDateStringToFormat(vertretungsplan.last_updated, "day-month-short")} um ${convertTimeStringToFormat(vertretungsplan.last_updated, "hour-minute")}`
                        }}</span
                    >
                    <span v-else>unbekannt</span>
                </div>
            </section>
            <footer v-if="vertretungsplan.days.length" class="blurred-background rounded-full w-fit p-2">
                <FluidButtonGroup>
                    <FluidQuickSwitch :options="planSelectionOptions" @update="switchDay"></FluidQuickSwitch>
                    <FluidButton class="text-2xl" :icon="['fas', 'arrow-rotate-right']" @click="fetchVertretungsplan"></FluidButton>
                </FluidButtonGroup>
            </footer>
        </div>
        <FullPageSpinner v-else></FullPageSpinner>
    </div>
</template>

<script setup lang="ts">
const distanceToLastUpdated = ref<string | null>(null);
const card = useTemplateRef("card");
const content = useTemplateRef("content");
let distanceInterval: NodeJS.Timeout;
const useRelativeDistance = ref(true);
function createContinuousUpdate() {
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
    const duration = 500;
    if (!card.value || !content.value) return (selected.value = index);
    const blendOpacity = (opacity: string) =>
        content.value?.animate({ opacity }, { duration: duration / 2, fill: "forwards", easing: "ease-in-out" });
    card.value.$el.animate({ transform: "rotateY(180deg)" }, { duration, easing: "ease-in-out" });
    blendOpacity("0");
    await useWait(duration);
    selected.value = index;
    await useWait(30);
    blendOpacity("1");
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
const selectedDay = computed(() => vertretungsplan.value?.days?.at(selected.value));
const vertretungsplan = useVertretungsplan();
onMounted(() => {
    createContinuousUpdate();
});
onBeforeUnmount(() => {
    // This may not be strictly neccesary, but to just
    // have some nice clean up of our mess we do this
    clearInterval(distanceInterval);
});
watch(vertretungsplan, () => {
    clearInterval(distanceInterval);
    selected.value = 0;
    createContinuousUpdate();
});
</script>

<style scoped>
.wrapper {
    grid-template-rows: 1fr min-content;
}
</style>
