<template>
    <div class="generic-fullpage-dialog">
        <div class="blurred-background">
            <h1 class="text-4xl">:/</h1>
            <span>Ein Fehler ist aufgetreten</span>
            <CodeDisplay class="max-h-52 overflow-scroll" :data="relevantErrorData"></CodeDisplay>
            <ButtonRoundedBlurred :icon="['fas', 'arrow-rotate-right']" @click="retry">{{
                retryFunction ? "Erneut versuchen" : "Seite neu laden"
            }}</ButtonRoundedBlurred>
            <div class="button-group grid gap-2" v-for="group of buttons">
                <ButtonRoundedBlurred v-for="button of group" :icon="button.icon" @click="executeButtonAction(button)">{{
                    button.text
                }}</ButtonRoundedBlurred>
            </div>
            <div class="mt-4 flex gap-2 items-center justify-center blurred-background borderless rounded-xl py-2" v-if="performingReauth">
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
import type { AnyFunction } from "~/common";

interface Button {
    icon?: string[];
    text?: string;
    action?: Function;
}
const props = defineProps<{ error: any; retryFunction?: AnyFunction; buttons?: Button[][]; performingReauth?: boolean }>();
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
</script>

<style scoped>
.button-group {
    grid-template-columns: auto auto;
}
</style>
