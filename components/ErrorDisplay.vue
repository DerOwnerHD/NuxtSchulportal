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
            <div v-if="error.is_reauth_required || error.next_request_after" class="h-4"></div>
            <aside class="blurred-background borderless" v-if="error.is_reauth_required">
                <template v-if="isLoggingIn">
                    <InfiniteSpinner :size="20"></InfiniteSpinner>
                    <span>Du wirst neu eingeloggt</span>
                </template>
                <template v-else>
                    <font-awesome-icon :icon="['fas', 'check']"></font-awesome-icon>
                    <span>Neu eingeloggt</span>
                </template>
            </aside>
            <aside class="blurred-background borderless" v-if="error.next_request_after">
                <span v-if="rateLimitTimer"> Bitte warte noch {{ rateLimitTimer }} Sekunde(n) </span>
                <template v-else>
                    <font-awesome-icon :icon="['fas', 'check']"></font-awesome-icon>
                    <span>Los geht's!</span>
                </template>
            </aside>
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

onMounted(() => {
    startRateLimitTimer();
});

/**
 * When the user leaves the page with the error while the countdown is still running,
 * the value of next_request_after loses all its importance. As it is not stored as
 * a timestamp, it will be reset upon the next visit. We cannot change that w/o deep, useless changes.
 */
onBeforeUnmount(() => {
    clearInterval(rateLimitHandler.value);
});

const rateLimitTimer = ref(props.error.next_request_after ? Math.ceil(props.error.next_request_after / 1000) : null);
const rateLimitHandler = ref<NodeJS.Timeout | undefined>(undefined);
function startRateLimitTimer() {
    if (!rateLimitTimer.value) return;
    rateLimitTimer.value = Math.ceil(rateLimitTimer.value);
    rateLimitHandler.value = setInterval(() => {
        if (rateLimitTimer.value === null || --rateLimitTimer.value <= 0) return clearInterval(rateLimitHandler.value);
    }, 1000);
}
</script>

<style scoped>
.button-group {
    grid-template-columns: auto auto;
}
aside {
    @apply flex gap-2 items-center justify-center rounded-xl py-2;
}
</style>
