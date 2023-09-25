<template>
    <div class="relative">
        <div class="flex w-screen items-center justify-center">
            <ClientOnly>
                <font-awesome-icon class="mr-2" :icon="['fas', 'newspaper']"></font-awesome-icon>
            </ClientOnly>
            <h1>Neuigkeiten</h1>
            <small v-if="plan && dateOfDay" class="ml-1">‎ für den {{ dateOfDay }}</small>
        </div>
        <div class="grid place-content-center py-2" v-if="!plan">
            <div class="error" v-if="appErrors.vplan">
                <span>{{ appErrors.vplan }}</span>
            </div>
            <div class="spinner" style="--size: 2rem" v-else></div>
        </div>
        <main id="sheet-inner-content" class="mt-2 text-sm mx-5" v-else>
            <ul v-if="selectedDay.news.length">
                <li v-for="item of selectedDay.news" v-html="item"></li>
            </ul>
            <p v-else>Keine Neuigkeiten</p>
        </main>
    </div>
</template>

<script lang="ts">
export default defineComponent({
    name: "VPlanNewsSheet",
    emits: ["close"],
    data() {
        return {
            appErrors: useAppErrors(),
            plan: useState<Vertretungsplan>("vplan"),
            selected: useState<number>("vplan-selected")
        };
    },
    computed: {
        selectedDay() {
            return this.plan.days[this.selected || 0];
        },
        dateOfDay() {
            const time = new Date(this.selectedDay.date || NaN);
            if (isNaN(time.getTime())) return null;
            return `${addZeroToNumber(time.getDate())}.${addZeroToNumber(time.getMonth() + 1)}.`;
        }
    }
});
</script>

<style scoped>
li {
    text-align: left;
    list-style: disc inside;
    line-break: loose;
}
</style>
