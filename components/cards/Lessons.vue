<template>
    <main v-if="cardsOpen.includes('lessons')">
        <div class="mb-2 relative rounded-2xl w-[90%] mx-[5%] z-0 gradient-border max-w-[18rem] text-white">
            <div>
                <p class="text-center">In Arbeit...™</p>
            </div>
        </div>
    </main>
    <footer>
        <button @click="openLink('https://start.schulportal.hessen.de/meinunterricht.php')">
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
            cardsOpen: useState<Array<string>>("cards-open"),
            appErrors: useAppErrors()
        };
    },
    computed: {},
    methods: {}
});
</script>

<style scoped></style>
