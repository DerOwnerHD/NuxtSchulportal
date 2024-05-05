<template>
    <BasicCard classes="grid max-w-80" class="mt-2">
        <div class="text-center">
            <h1 class="text-6xl">:/</h1>
            <p>Das sollte nicht passieren!</p>
        </div>
        <div v-if="error" class="max-w-full">
            <p class="text-justify">{{ error.message }}</p>
            <pre class="dark" v-html="data"></pre>
            <pre class="dark" v-html="error.stack"></pre>
        </div>
        <div class="grid buttons mt-2">
            <ButtonDefault :icon="['fas', 'arrow-rotate-right']" @click="navigateTo('/', { external: true })">
                <span>Nach Hause</span>
            </ButtonDefault>
            <ButtonDefault :icon="['fas', 'arrow-right-from-bracket']" @click="logOff">
                <span>Abmelden</span>
            </ButtonDefault>
        </div>
    </BasicCard>
</template>

<script setup lang="ts">
const error = useError();
// @ts-ignore
const data = computed(() => {
    if (!error.value) return;
    const { data } = error.value;
    if (typeof data === "object") return syntaxHighlight(data);
    if (typeof data === "string") {
        try {
            return syntaxHighlight(JSON.parse(data));
        } catch {
            return syntaxHighlight(data);
        }
    }
    return data;
});
</script>

<style scoped>
.buttons {
    grid-template-columns: 1fr 1fr;
    column-gap: 0.5rem;
}
pre {
    @apply overflow-x-auto w-[19rem];
}
</style>
