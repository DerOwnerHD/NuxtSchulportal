<template>
    <div class="h-full w-screen grid place-content-center">
        <div class="blurred-background backdrop-blur-md p-4 w-72 text-center grid gap-2 rounded-2xl">
            <h1 class="text-4xl">:/</h1>
            <span>Ein Fehler ist aufgetreten</span>
            <CodeDisplay :data="error"></CodeDisplay>
            <ButtonRoundedBlurred
                :icon="['fas', 'arrow-rotate-right']"
                :text="retryFunction ? 'Erneut versuchen' : 'Seite neu laden'"
                @click="retry"></ButtonRoundedBlurred>
            <div class="button-group grid gap-2" v-for="group of buttons">
                <ButtonRoundedBlurred
                    v-for="button of group"
                    :icon="button.icon"
                    @click="executeButtonAction(button)"
                    :text="button.text"></ButtonRoundedBlurred>
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
const props = defineProps<{ error: any; retryFunction?: Function; buttons?: Button[][] }>();
async function retry() {
    if (!props.retryFunction) return location.reload();
    await props.retryFunction();
}
async function executeButtonAction(button: Button) {
    if (!button.action) return;
    await button.action();
}
</script>

<style scoped>
.button-group {
    grid-template-columns: auto auto;
}
</style>
