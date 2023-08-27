<template>
    <main class="mb-2 relative rounded-2xl w-[90%] mx-[5%] z-0 gradient-border max-w-[18rem]" v-if="cardsOpen.includes('splan')">
        <div class="py-1.5">
            <p class="text-center" id="splan-date">
                <b></b><small>, <span id="splan-date-dow"></span></small>
            </p>
            <div class="flex">
                <div id="lessons" class="text-center mx-3"></div>
                <div id="classes" class="pl-3 mr-3 overflow-hidden"></div>
            </div>
        </div>
    </main>
    <footer>
        <button>
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'chevron-down']"></font-awesome-icon>
            </ClientOnly>
            <span>Ganzer Plan</span>
        </button>
        <button>
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'repeat']"></font-awesome-icon>
            </ClientOnly>
            <span>Wechseln</span>
        </button>
    </footer>
</template>

<script lang="ts">
export default defineComponent({
    name: "SPlan",
    data() {
        return {
            cardsOpen: useState<Array<string>>("cards-open")
        };
    }
});
</script>

<style scoped>
#classes {
    border-left: solid 1px;
    border-image: linear-gradient(#00000000 0%, #ffffff 50%, #00000000 100%) 1;
    max-width: 70%;
}
p {
    white-space: nowrap;
}
</style>
