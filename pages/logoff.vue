<template>
    <div class="generic-fullpage-dialog">
        <div class="blurred-background">
            <h1 class="text-4xl">👋</h1>
            <div>
                <p>Willst du dich abmelden?</p>
                <small>Alle Daten werden gelöscht!</small>
            </div>
            <div class="grid gap-2 grid-cols-2">
                <ButtonRoundedBlurred v-for="button of buttons" :icon="button.icon" @click="executeButtonAction(button)">{{
                    button.text
                }}</ButtonRoundedBlurred>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Button {
    icon?: string[];
    text?: string;
    action?: Function;
}
const buttons: Button[] = [
    { icon: ["fas", "long-arrow-left"], text: "Zurück", action: () => useRouter().back() },
    { icon: ["fas", "arrow-right-from-bracket"], text: "Abmelden", action: () => logOff(true) }
];
async function executeButtonAction(button: Button) {
    if (!button.action) return;
    await button.action();
}
</script>
