<template>
    <main class="gradient-border w-[90%] mx-[5%] rounded-2xl mb-2 z-[2]" v-if="cards.includes('calendar')">
        <div class="relative p-2">
            <div class="placeholder" v-if="entries === null && err === ''">
                <div header-alike></div>
                <div></div>
                <div></div>
                <div></div>
            </div>
            <div v-else-if="entriesForCategory != null && categoryDetails" class="mx-2">
                <header class="flex items-center">
                    <div class="flex items-center whitespace-nowrap">
                        <font-awesome-icon class="mr-2" :icon="categoryDetails.icon"></font-awesome-icon>
                        <span header-alike>{{ categoryDetails.name }}</span>
                        <span class="rounded-full bg-white text-black h-4 px-1 grid place-content-center ml-2 text-sm">{{
                            entriesForCategory.length
                        }}</span>
                    </div>
                    <div class="h-[1px] bg-[#636363] w-full ml-2"></div>
                </header>
                <ul class="ml-2 list-disc" v-if="entriesForCategory.length">
                    <li v-for="entry of entriesForCategory?.slice(0, 3)" class="opacity-0">
                        <span>{{ entry.title }}</span>
                        <small>
                            {{ parseDate(entry) }}
                        </small>
                        <small v-if="entry.location">
                            <font-awesome-icon :icon="['fas', 'location-dot']"></font-awesome-icon>
                            {{ entry.location }}
                        </small>
                        <small v-if="!entry.public || entry.private">
                            <font-awesome-icon :icon="['fas', 'lock']"></font-awesome-icon>
                        </small>
                    </li>
                </ul>
                <p v-else>Keine Einträge ¯\_(ツ)_/¯</p>
            </div>
        </div>
    </main>
    <footer>
        <button>
            <font-awesome-icon :icon="['fas', 'chevron-down']"></font-awesome-icon>
            <span>Mehr</span>
        </button>
        <button>
            <font-awesome-icon :icon="['fas', 'repeat']"></font-awesome-icon>
            <span>Kategorie</span>
            <select class="absolute left-0 h-full w-full opacity-0" @change="updateCategory" v-if="entries !== null">
                <option v-for="item of calendarCategories" :disabled="item.hidden" :value="item.id" :selected="category === item.id">
                    {{ item.name || "Unbekannt" }} ({{ entries.filter((x) => x.category === item.id).length }})
                </option>
            </select>
        </button>
    </footer>
</template>

<script setup lang="ts">
const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const cards = useOpenCards();
const err = ref("");
// 1 is the "Klausuren" category, the one which we want to
// show by default (might the most important for users)
const category = ref(1);
const categoryDetails = computed(() => calendarCategories.find((x) => x.id === category.value));
const entriesForCategory = computed(() => entries.value?.filter((x) => x.category === category.value));
// null is only the initial value to detect once something has been set
const entries = ref<CalendarEntry[] | null>(null);
onMounted(async () => {
    const { data, error } = await fetchCalendar({ start: "year" });
    if (error.value !== null) return (err.value = error.value.data?.error_details ?? error.value.cause);
    // It should be impossible: if an error does not exist
    // the data, aka body, has to exist (to best of my knowledge)
    entries.value = data.value?.entries ?? [];
});
function updateCategory(event: Event) {
    const { target } = event;
    if (!(target instanceof HTMLSelectElement)) return;
    const value = parseInt(target.value);
    // @ts-expect-error style not defined on Element but HTMLElement
    document.querySelectorAll("article[card=calendar] li").forEach((item: HTMLElement) => (item.style.opacity = "0"));
    category.value = value;
}
function parseDate(entry: CalendarEntry): string | null {
    const dates = [new Date(entry.start), new Date(entry.end)];
    if (dates.some((date) => date.toString() === "Invalid Date")) return null;
    const time = dates.map((date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`);
    const days = dates.map((date) => `${date.getDate()}. ${months[date.getMonth()]}.`);
    const isSameDay = startDayIsEndDay(entry);
    if (isSameDay) return entry.all_day ? `${days[0]}` : `${days[0]} von ${time[0]} bis ${time[1]}`;
    return entry.all_day ? `${days[0]} bis ${days[1]}` : `${days[0]} um ${time[0]} bis ${days[1]} um ${time[1]}`;
}
function startDayIsEndDay(entry: CalendarEntry): boolean {
    // NOTE: We deliberatly ignore the case when it is the same day but
    // not the whole day long, this gets checked by parseDate, not this
    // function's responsibility (was previously implemented like that)
    const start = new Date(entry.start);
    const end = new Date(entry.end);
    // If for example an exam is set for just one day, the end will be set to the day
    // after (with no time being set just yyyy-mm-dd), thus we can ignore that
    // Date.prototype.getTime is measured in ms
    if (end.getTime() - start.getTime() === 1000 * 60 * 60 * 24 && entry.all_day) return true;
    return start.getDate() === end.getDate() && start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
}
async function fadeIn() {
    if (!cards.value.includes("calendar") || err.value || !Array.isArray(entries.value)) return;
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
    document.querySelectorAll("article[card=calendar] li").forEach(fadeInElement);
}
watch(entries, fadeIn);
watch(cards, (value, old) => {
    if (value.includes("calendar") && !old.includes("calendar")) fadeIn();
});
watch(category, fadeIn);
</script>

<style scoped>
.placeholder {
    div {
        @apply rounded-full mx-2 my-1;
        height: 1rem;
        width: 70%;
    }
    [header-alike] {
        width: 50%;
    }
}
ul > li > span {
    line-break: anywhere;
}
ul small {
    @apply bg-white text-black rounded-full px-1.5 py-0.5 mx-0.5 my-0.5 whitespace-nowrap inline w-fit items-center;
}
</style>
