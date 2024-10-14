<template>
    <div :class="{ 'generic-fullpage-dialog': !inlined }">
        <div class="blurred-background" :class="{ 'inlined-error-display': inlined }">
            <h1 class="text-4xl">:/</h1>
            <span>Ein Fehler ist aufgetreten</span>
            <CodeDisplay class="max-h-52 overflow-scroll" :data="relevantErrorData"></CodeDisplay>
            <ButtonRoundedBlurred :icon="['fas', 'arrow-rotate-right']" @click="retry">{{
                error.retry_function ? "Erneut versuchen" : "Seite neu laden"
            }}</ButtonRoundedBlurred>
            <div class="button-group grid gap-2" v-for="group of buttons">
                <ButtonRoundedBlurred v-for="button of group" :icon="button.icon" @click="executeButtonAction(button)">{{
                    button.text
                }}</ButtonRoundedBlurred>
            </div>
            <div class="mt-4 flex gap-2 items-center justify-center blurred-background borderless rounded-xl py-2" v-if="error.is_reauth_required">
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
    action?: AnyFunction;
}
const props = defineProps<{ error: AppErrorMetadata; buttons?: Button[][]; inlined?: boolean }>();
const relevantErrorData = computed(() => props.error.error);
async function retry() {
    if (!props.error.retry_function) return location.reload();
    await props.error.retry_function();
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
