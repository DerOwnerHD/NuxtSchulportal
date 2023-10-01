<template>
    <article class="card" :style="'--gradient: ' + gradient" :card="type">
        <header class="grid my-2 justify-center relative">
            <div class="title relative z-[1] rounded-full shadow-md">
                <div class="py-2 px-3 rounded-full flex items-center">
                    <div class="relative">
                        <ClientOnly>
                            <font-awesome-icon class="text-white text-xl mr-2 ml-1" :icon="icon"></font-awesome-icon>
                        </ClientOnly>
                        <span class="news-icon absolute top-[-0.25rem] right-0" style="--size: 1rem" v-if="news[type]">{{ news[type] }}</span>
                    </div>
                    <h1>{{ name }}</h1>
                </div>
            </div>
            <button
                @click="toggleCardVisibiltiy"
                class="absolute right-5 top-2 rounded-full text-white w-7 h-7 shadow-md bg-[#ffffff65] hover:active:scale-[0.95]">
                <ClientOnly>
                    <font-awesome-icon :icon="['fas', cardsOpen.includes(type) ? 'chevron-up' : 'chevron-down']"></font-awesome-icon>
                </ClientOnly>
            </button>
        </header>
        <CardsMoodle v-if="type === 'moodle'" :extended="cardsOpen.includes(type)"></CardsMoodle>
        <CardsLessons v-if="type === 'lessons'" :extended="cardsOpen.includes(type)"></CardsLessons>
        <CardsVPlan v-if="type === 'vplan'" :extended="cardsOpen.includes(type)"></CardsVPlan>
        <CardsSPlan v-if="type === 'splan'" :extended="cardsOpen.includes(type)"></CardsSPlan>
        <CardsMessages v-if="type === 'messages'"></CardsMessages>
    </article>
</template>

<script lang="ts">
export default defineComponent({
    name: "Card",
    data() {
        return {
            cardsOpen: useState<Array<string>>("cards-open"),
            news: useAppNews()
        };
    },
    methods: {
        async toggleCardVisibiltiy() {
            const cardsOpen = useState<Array<string>>("cards-open");
            if (!cardsOpen.value.includes(this.type)) {
                cardsOpen.value.push(this.type);
                useLocalStorage("cards-open", JSON.stringify(cardsOpen.value));
                return;
            }

            const index = cardsOpen.value.indexOf(this.type);
            if (index === -1) return;

            cardsOpen.value.splice(index, 1);
            useLocalStorage("cards-open", JSON.stringify(cardsOpen.value));
        }
    },
    props: {
        type: {
            type: String,
            required: true
        },
        gradient: {
            type: String,
            required: true
        },
        icon: {
            type: Array,
            required: false
        },
        name: {
            type: String,
            required: true
        }
    }
});
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
