<template>
    <UtilsDialogBox id="oberstufenwahl">
        <div v-if="elections?.length">
            <h1 class="text-xl">
                🥳 {{ ENUMERATIONS[elections.length - 1] ?? elections.length }} Wahl{{ moreThanOneElection ? "en stehen" : " steht" }} an!
            </h1>
            <div v-for="election of elections" class="election">
                <h3 header-alike>{{ election.title }}</h3>
                <span> {{ election.hasStarted ? "Endet" : "Beginnt" }} in {{ election.distance }} </span>
                <br />
                <button
                    v-if="election.hasStarted"
                    class="button-with-symbol !mx-0 !mt-1"
                    @click="openLink(`https://start.schulportal.hessen.de/oberstufenwahl.php?a=abgabe&w=${election.id}`)">
                    <font-awesome-icon :icon="['fas', 'up-right-from-square']"></font-awesome-icon>
                    <span>Abstimmen</span>
                </button>
            </div>
            <small>Diese Nachricht siehst du nach 24 Stunden wieder</small>
        </div>
        <div v-else>
            <span>Oops... es gibt gar keine Wahlen</span>
        </div>
    </UtilsDialogBox>
</template>

<script setup lang="ts">
const ENUMERATIONS = ["Eine", "Zwei", "Drei", "Vier", "Fünf"];
const elections = useState<OberstufenwahlMetadata[]>("oberstufenwahlen-meta");
const moreThanOneElection = computed(() => elections.value.length > 1);
</script>

<style scoped>
.election:not(:first-of-type) {
    border-top: solid 1px;
    border-image: var(--white-gradient-border-image);
    @apply pt-2;
}
.election:not(:last-of-type) {
    @apply pb-3;
}
</style>
