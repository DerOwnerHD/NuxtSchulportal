<template>
    <main v-if="cardsOpen.includes('moodle')">
    </main>
    <footer>
        <button>
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'up-right-from-square']"></font-awesome-icon>
            </ClientOnly>
            <span>Öffnen</span>
        </button>
    </footer>
</template>

<script lang="ts">
export default defineComponent({
    name: "Moodle",
    data() {
        return {
            months: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
            cardsOpen: useState<Array<string>>("cards-open"),
            plan: useState<Vertretungsplan>("vplan"),
            appErrors: useAppErrors()
        };
    },
    computed: {
        
    },
    methods: {
        
    }
});
</script>

<style scoped>
#table {
    > div > div {
        min-width: 45%;
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
