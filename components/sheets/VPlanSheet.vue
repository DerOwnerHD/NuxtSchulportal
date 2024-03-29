<template>
    <div class="relative">
        <div class="flex w-screen items-center justify-center">
            <font-awesome-icon class="mr-2" :icon="['fas', 'book']"></font-awesome-icon>
            <h1>Vertretungsplan</h1>
        </div>
        <font-awesome-icon
            class="rounded-button absolute right-5 top-[-0.5rem] !p-2"
            :icon="['fas', 'up-right-from-square']"
            onclick="window.open('https://start.schulportal.hessen.de/vertretungsplan.php')">
        </font-awesome-icon>
        <button
            class="rounded-button absolute left-5 top-[-0.5rem] !p-2 !px-3 h-8 flex justify-center items-center"
            v-if="plan && plan.days && plan.days.length"
            @click="openNewsSheet">
            <font-awesome-icon :icon="['fas', 'newspaper']"></font-awesome-icon>
            <span class="ml-2" v-if="selectedDay">{{ selectedDay.news.length }}</span>
        </button>
        <div class="grid place-content-center py-2" v-if="!plan">
            <div class="error" v-if="appErrors.vplan">
                <span>{{ appErrors.vplan }}</span>
            </div>
            <div class="spinner" style="--size: 2rem" v-else></div>
        </div>
        <main id="sheet-inner-content" v-else>
            <div class="flex justify-center w-screen my-2">
                <div class="warning" v-if="plan.updating">Der Plan wird (angeblich) aktualisiert</div>
            </div>
            <div class="select" id="vplan-day" v-if="plan.days.length">
                <div
                    v-for="(day, index) of plan.days"
                    :id="index.toString()"
                    :selected="selected === index ? '' : null"
                    @click="updateSelectedDay(index)">
                    <span
                        v-html="
                            (() => {
                                const date = new Date(day.date);
                                return `<b>${days[date.getDay() - 1]}</b> ${addZeroToNumber(date.getDate())}.${addZeroToNumber(
                                    date.getMonth() + 1
                                )}.`;
                            })()
                        "></span>
                    <span class="bg-white text-black rounded-full ml-2 px-1.5 text-sm py-0.5 drop-shadow" v-if="day.relative">
                        {{ day.relative }}
                    </span>
                    <span class="news-icon !inline-grid ml-1.5" v-if="day.vertretungen.length">{{ day.vertretungen.length }}</span>
                </div>
            </div>
            <div id="table-wrapper" class="grid justify-center overflow-auto pb-2" v-if="selectedDay && plan.days.length">
                <p v-if="!selectedDay.vertretungen.length">Keine Vertretungen 😭</p>
                <table class="w-[95vw]" v-else>
                    <thead>
                        <tr>
                            <td v-for="row in ['clock', 'book', 'user', 'user-slash', 'location-dot', 'info']">
                                <font-awesome-icon :icon="['fas', row]"></font-awesome-icon>
                            </td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="{ lessons, subject, subject_old, substitute, teacher, room, note } of selectedDay.vertretungen">
                            <td>{{ lessons.list.length > 1 ? lessons.from + " - " + lessons.to : lessons.from }}</td>
                            <td>{{ subject || subject_old || "-" }}</td>
                            <td>{{ replaceShortNameBySurname(substitute || "") || "-" }}</td>
                            <td>{{ replaceShortNameBySurname((teacher || "").replace(/<\/?del>/gi, "")) }}</td>
                            <td>{{ room || "-" }}</td>
                            <td>{{ note || "-" }}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="flex justify-center" v-if="lastUpdated">
                    <div class="mt-2 px-3 rounded-full border-white border-[1px] w-fit drop-shadow">
                        <font-awesome-icon :icon="['fas', 'clock']"></font-awesome-icon>
                        <span class="ml-2" v-html="lastUpdated"></span>
                    </div>
                </div>
            </div>
            <p v-else>Keine Tage verfügbar</p>
        </main>
    </div>
</template>

<script lang="ts">
export default defineComponent({
    name: "VPlanSheet",
    emits: ["close"],
    mounted() {
        useState("vplan-selected").value = 0;
    },
    data() {
        return {
            appErrors: useAppErrors(),
            plan: useState<Vertretungsplan>("vplan"),
            lerngruppen: useLerngruppen(),
            days: ["Mo", "Di", "Mi", "Do", "Fr"],
            selected: 0
        };
    },
    computed: {
        selectedDay() {
            if (!this.plan.days.length) return null;
            return this.plan.days[this.selected];
        },
        lastUpdated() {
            const time = new Date(this.plan.last_updated || NaN);
            if (isNaN(time.getTime())) return null;
            return `${addZeroToNumber(time.getDate())}.${addZeroToNumber(time.getMonth() + 1)}.${time.getFullYear()}
                um ${addZeroToNumber(time.getHours())}:${addZeroToNumber(time.getMinutes())} Uhr`;
        },
        knownTeachers() {
            const teachers = [];
            for (const group of this.lerngruppen) {
                const { name } = group.teacher;
                const nameWithoutShort = name.replace(/\([^)]+\)/, "").trim();
                const short = name.split("(")[1]?.replace(")", "").trim();
                const surname = nameWithoutShort.split(", ")[0];
                teachers.push({ short, surname });
            }

            return teachers;
        }
    },
    methods: {
        async updateSelectedDay(day: number) {
            this.selected = day;
            const sheet = document.querySelector(`aside[menu="vplan"]`);
            if (!(sheet instanceof HTMLElement) || sheet.hasAttribute("moving")) return;

            const previousHeight = sheet.clientHeight;
            sheet.style.height = `${previousHeight}px`;

            // We have to limit the size of the list, it
            // for some reason doesn't work when just setting
            // it normally using overflow css property
            const content = sheet.querySelector("#table-wrapper");
            if (!content || !(content instanceof HTMLElement)) return;

            content.style.maxHeight = "";

            this.selected = day;
            useState("vplan-selected").value = day;

            sheet.setAttribute("moving", "");

            await useWait(1);
            sheet.style.height = "";
            const newHeight = sheet.clientHeight;
            sheet.style.height = `${Math.max(newHeight, previousHeight)}px`;

            let movements = [{ transform: "translateY(0px)" }, { transform: `translateY(${previousHeight - newHeight}px)` }];

            if (newHeight > previousHeight)
                movements = [{ transform: `translateY(${newHeight - previousHeight}px)` }, { transform: "translateY(0px)" }];

            const animation = sheet.animate(movements, {
                duration: 500,
                easing: "ease-in-out"
            });

            await useWait(490);
            animation.cancel();
            sheet.removeAttribute("moving");
            sheet.style.height = "";

            content.style.maxHeight = `${Math.floor(window.innerHeight - content.getBoundingClientRect().top)}px`;
        },
        openNewsSheet() {
            useOpenSheet("vplan-news", true);
        },
        replaceShortNameBySurname(short: string) {
            const teacher = this.knownTeachers.find((x) => x.short === short);
            return teacher?.surname ?? short;
        }
    }
});
</script>

<style scoped>
td,
th {
    @apply px-0.5;
    border: solid 1px #636363;
}
</style>
