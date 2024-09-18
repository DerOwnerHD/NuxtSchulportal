<template>
    <div class="py-4">
        <InfoBox type="warning">
            <p>
                <span>
                    Diese Tabelle stammt von
                    <HighlightedLink :to="ATTENDANCE_HELP_LINK">dieser Seite</HighlightedLink>.
                </span>
                <br />
                <span>Sie kann Fehler oder Ungenauigkeiten beinhalten.</span>
            </p>
        </InfoBox>
        <div class="max-w-screen overflow-x-scroll">
            <table class="max-w-screen">
                <thead>
                    <tr>
                        <th>Titel</th>
                        <th>anwesend</th>
                        <th>unentschuldigt</th>
                        <th>entschuldigt</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="{ title, values } of items">
                        <td>{{ title }}</td>
                        <td v-for="value of values" class="text-center">
                            <font-awesome-icon v-if="value" :icon="['fas', 'check']"></font-awesome-icon>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
const ATTENDANCE_HELP_LINK = "https://start.schulportal.hessen.de/meinunterricht.php?a=attendanceHelp";
const items = [
    { title: "anwesend", values: [true, false, false] },
    { title: "fehlend", values: [false, true, false] },
    { title: "entschuldigt", values: [false, false, true] },
    { title: "entschuldigt durch Attest", values: [false, false, true] },
    { title: "verspätet", values: [true, false, false] },
    { title: "schuldlos verspätet", values: [true, false, false] },
    { title: "unentschuldbar verspätet", values: [true, false, false] },
    { title: "tlw. fehlend, dann anwesend", values: [true, true, false] },
    { title: "tlw. entschuldigt, dann anwesend", values: [true, false, true] },
    { title: "früher gehend", values: [true, false, false] },
    { title: "tlw. anwesend, dann fehlend", values: [true, true, false] },
    { title: "tlw. anwesend, dann entschuldigt", values: [true, false, true] },
    { title: "beurlaubt(entschuldigte Fehlstunde)", values: [false, false, true] },
    { title: "tlw. beurlaubt(entschuldigte Fehlstunde)", values: [true, false, true] },
    { title: "betrieblich beurlaubt(entschuldigte Fehlstunde)", values: [false, false, true] },
    { title: "andere schulische Veranstaltung(keine Fehlstunde)", values: [false, false, false] },
    { title: "tlw. andere schulische Veranstaltung(keine Fehlstunde)", values: [true, false, false] },
    { title: "verletzt anwesend", values: [true, false, false] },
    { title: "verletzt anwesend mit Entschuldigung", values: [true, false, false] },
    { title: "verletzt anwesend mit Attest", values: [true, false, false] },
    { title: "ohne Sportsachen teilnehmend", values: [true, false, false] },
    { title: "ohne Sportsachen anwesend", values: [true, false, false] },
    { title: "verspätet ohne Sportsachen anwesend", values: [true, false, false] },
    { title: "ohne Arbeitskleidung anwesend", values: [true, false, false] },
    { title: "ohne Arbeitsmittel anwesend", values: [true, false, false] },
    { title: "unentschuldbar(unentschuldigte Fehlstunde)", values: [false, true, false] },
    { title: "unbekannt", values: [false, false, false] },
    { title: "Anwesenheitspflicht ausgesetzt", values: [false, false, false] },
    { title: "online anwesend", values: [true, false, false] }
];
</script>
