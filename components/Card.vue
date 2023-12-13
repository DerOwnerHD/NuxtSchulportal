<template>
    <article class="card" :style="'--gradient: ' + gradient" :card="type">
        <header class="grid my-2 justify-center relative">
            <div class="title relative z-[1] rounded-full shadow-md">
                <div class="py-2 px-3 rounded-full flex items-center">
                    <div class="relative">
                        <font-awesome-icon class="text-white text-xl mr-2 ml-1" :icon="icon"></font-awesome-icon>
                        <span class="news-icon absolute top-[-0.25rem] right-0" style="--size: 1rem" v-if="news[type]">{{ news[type] }}</span>
                    </div>
                    <h1>{{ name }}</h1>
                </div>
            </div>
            <button
                @click="toggleCardVisibiltiy"
                class="absolute right-5 top-2 rounded-full text-white w-7 h-7 shadow-md bg-[#ffffff65] hover:active:scale-[0.95]">
                <font-awesome-icon :icon="['fas', cards?.includes(type) ? 'chevron-up' : 'chevron-down']"></font-awesome-icon>
            </button>
        </header>
        <CardsVPlan v-if="type === 'vplan'"></CardsVPlan>
        <CardsSPlan v-if="type === 'splan'"></CardsSPlan>
        <CardsMoodle v-if="type === 'moodle'"></CardsMoodle>
        <CardsMessages v-if="type === 'messages'"></CardsMessages>
        <CardsCalendar v-if="type === 'calendar'"></CardsCalendar>
        <CardsLessons v-if="type === 'lessons'"></CardsLessons>
    </article>
</template>

<script setup lang="ts">
const cards = useOpenCards();
const news = useAppNews();
const props = defineProps<{ type: string; gradient: string; icon: string[]; name: string }>();
async function toggleCardVisibiltiy() {
    // Card open states are stored in local storage
    // There is no need to pass the stuff to the server
    if (!cards.value.includes(props.type)) {
        // Doing so will create a new array, which will trigger when watching
        // the proxy using the Vue watch function (using Array.prototype.push won't)
        cards.value = [...cards.value, props.type];
        useLocalStorage("cards-open", JSON.stringify(cards.value));
        return;
    }
    const index = cards.value.indexOf(props.type);
    if (index === -1) return;
    cards.value.splice(index, 1);
    useLocalStorage("cards-open", JSON.stringify(cards.value));
}
</script>

<style scoped>
article[card] {
    @apply w-80 mt-4 rounded-2xl relative grid;
    background: var(--gradient);
    border-top: solid 1px;
    border-image: linear-gradient(90deg, #00000000 10%, #ffffff 50%, #00000000 90%) 1;
    > header {
        .title {
            background-clip: padding-box;
            border: solid 3px transparent;
            box-sizing: border-box;
            > div {
                background: linear-gradient(to bottom, #1f1f1f, #0e0e0e);
            }
        }
        .title::before {
            @apply z-[-1] m-[-3px] bottom-0 top-0 left-0 right-0 absolute drop-shadow-xl rounded-[inherit] content-[""];
            background: var(--gradient);
        }
    }
}
</style>
