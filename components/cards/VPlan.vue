<template>
    <main v-if="cardsOpen.includes('vplan')">
        <div id="table" class="w-[90%] mx-[5%] rounded-2xl mb-2 text-white shadow-md z-0 relative gradient-border">
            <div class="grid place-content-center py-2" v-if="!plan">
                <div class="error" v-if="appErrors.splan">
                    <span>{{ appErrors.splan }}</span>
                </div>
                <div class="spinner" style="--size: 2rem" v-else></div>
            </div>
            <div class="flex rounded-[inherit] py-2 px-1" v-else>
                <div v-for="(day, index) of plan.days">
                    <header>{{ day.day_of_week.substring(0, 2) }}<small>, {{ datesForDays[index].day }}. {{ datesForDays[index].month }}</small></header>
                    <main>
                        <p v-if="!day.vertretungen.length">Keine Vertretungen</p>
                        <ul v-else>
                            <li v-for="{ lessons, subject, subject_old, substitute, teacher, room, note } of day.vertretungen">
                                [{{ lessons.list.length === 1 ? lessons.from : lessons.from + " - " + lessons.to }}] {{ subject || subject_old }}
                                <span>bei {{ substitute || "-" }}</span>
                                <span v-if="teacher" v-html="` (${ teacher })`"></span>
                                <span v-if="room">in {{ room }}</span>
                                <span v-if="note">({{ note }})</span>
                            </li>
                        </ul>
                    </main>
                </div>
            </div>
        </div>
        <p class="card-main-description">Aktualisert vor <span id="vplan-refresh"></span></p>
    </main>
    <footer>
        <button>
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'chevron-down']"></font-awesome-icon>
            </ClientOnly>
            <span>Details</span>
        </button>
        <button>
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'arrow-rotate-right']"></font-awesome-icon>
            </ClientOnly>
            <span>Neu laden</span>
        </button>
    </footer>
</template>

<script lang="ts">
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
        }
    }
});
</script>

<style scoped>
#table {
    > div > div {
        @apply basis-[50%];
        header {
            text-align: center;
        }
        main {
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
