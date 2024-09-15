<template>
    <div class="h-full w-screen grid place-content-center">
        <div class="blurred-background backdrop-blur-md p-4 w-72 text-center grid gap-2 rounded-2xl">
            <h1 class="text-4xl">:/</h1>
            <span>Ein Fehler ist aufgetreten</span>
            <CodeDisplay class="max-h-52 overflow-scroll" :data="relevantErrorData"></CodeDisplay>
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
            <div class="mt-4 flex gap-2 items-center justify-center blurred-background borderless rounded-xl py-2" v-if="showLoggingInDisplay">
                <template v-if="isLoggingIn">
                    <InfiniteSpinner :size="20"></InfiniteSpinner>
                    <span>Du wirst neu eingeloggt</span>
                </template>
                <template v-else>
                    <font-awesome-icon :icon="['fas', 'check']"></font-awesome-icon>
                    <span>Neu eingeloggt</span>
                </template>
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
const relevantErrorData = computed(() => props.error?.message ?? props.error);
async function retry() {
    if (!props.retryFunction) return location.reload();
    await props.retryFunction();
}
async function executeButtonAction(button: Button) {
    if (!button.action) return;
    await button.action();
}
const isLoggingIn = useLoggingInStatus();
const showLoggingInDisplay = ref(false);
onMounted(() => {
    if (toRaw(isLoggingIn.value)) showLoggingInDisplay.value = true;
});
</script>

<style scoped>
.button-group {
    grid-template-columns: auto auto;
}
</style>
