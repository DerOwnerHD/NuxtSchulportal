<template>
    <div id="card-news-container" class="flex w-80 justify-evenly mt-1">
        <article class="card-news" v-for="card of cards" :style="`background: ${card.gradient};`" @click="scrollToCard(card.id)">
            <font-awesome-icon :icon="card.icon"></font-awesome-icon>
            <span class="news-icon absolute right-0" v-if="news[card.id]">{{ news[card.id] }}</span>
        </article>
    </div>
    <Card v-for="card of cards" :type="card.id" :gradient="card.gradient" :icon="card.icon" :name="card.name"></Card>
    <div id="card-clone-container" v-if="selectedCard" :style="`--top: ${startTop}px`"></div>
</template>

<script setup lang="ts">
const news = useAppNews();
const cards = useCards();
const startTop = ref(0);
const awaitingStart = ref(false);
const selectedCard = ref<string | null>(null);
const cardPositions = ref<{ [key: string]: number }>({});
const cardClone = ref<HTMLElement | undefined>();
// The offset of the touch relative to the y position of the element
// -> used for calculating the translateY property
const touchOffset = ref(0);
const cardsOpen = useState<Array<string>>("cards-open");

async function touchStart(event: TouchEvent, type: string) {
    if (!(event.target instanceof HTMLElement) || selectedCard.value) return;
    // We do not want to process that when the user
    // is holding a button on the card for a longer time
    if (event.target.closest("button")) return;

    startTop.value = event.touches[0].clientY;

    awaitingStart.value = true;
    selectedCard.value = type;

    await useWait(1000);
    if (!awaitingStart.value) return;

    document.body.style.overflow = "hidden";

    const card = document.querySelector(`article[card=${type}]`);
    if (!(card instanceof HTMLElement)) return;

    // The 16px represent the margin of the element (1rem)
    startTop.value = card.getBoundingClientRect().top - 16;
    touchOffset.value = event.touches[0].clientY - card.getBoundingClientRect().top;

    card.animate([{ scale: "100%" }, { scale: "95%" }, { scale: "100%" }], { duration: 700, easing: "ease-in" });

    const index = cardsOpen.value.indexOf(type);
    if (index !== -1) {
        useState<Array<string>>("cards-open").value.splice(index, 1);
        useLocalStorage("cards-open", JSON.stringify(cardsOpen.value));
    }

    await useWait(700);
    if (!awaitingStart.value) return;

    const clone = card.cloneNode(true);
    if (!(clone instanceof HTMLElement)) return;

    card.style.opacity = "0";
    clone.classList.add("clone");

    await useWait(1);

    cardClone.value = document.querySelector("#card-clone-container")?.appendChild(clone);
    awaitingStart.value = false;
    calculateCardPositions();
}

async function scrollToCard(id: string) {
    await calculateCardPositions();
    window.scrollTo({ top: cardPositions.value[id] - 72, behavior: "smooth" });
}

async function calculateCardPositions() {
    await useWait(10);
    cardPositions.value = useCards().value.reduce(
        (acc, card) =>
            new Object({ ...acc, [card.id]: Math.floor(document.querySelector(`article[card=${card.id}]`)?.getBoundingClientRect().top || 0) }),
        {}
    );
}

function touchEnd() {
    const card = document.querySelector(`article[card=${selectedCard.value}]`);
    if (!(card instanceof HTMLElement)) return;
    card.style.opacity = "";
    document.body.style.overflow = "";
    selectedCard.value = null;
    awaitingStart.value = false;
}

function touchMove(event: TouchEvent) {
    awaitingStart.value = false;
    const clone = cardClone.value;
    if (!clone || !selectedCard) return;
    clone.style.transform = `translateY(${event.touches[0].clientY - startTop.value - touchOffset.value}px)`;
}
</script>

<style scoped>
@keyframes scaleInOut {
    from {
        scale: 100%;
    }
    50% {
        scale: 102%;
    }
    to {
        scale: 100%;
    }
}
#card-clone-container {
    @apply fixed top-0 h-full w-full z-10;
    > article.clone {
        @apply absolute;
        animation: scaleInOut 2000ms infinite;
        top: var(--top);
    }
}
.card-news {
    @apply rounded-full w-10 h-10 grid place-content-center text-xl hover:active:scale-95 relative;
}
</style>
