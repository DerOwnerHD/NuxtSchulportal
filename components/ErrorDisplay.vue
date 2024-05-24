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
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ error: any; retryFunction?: Function }>();
async function retry() {
    if (!props.retryFunction) return location.reload();
    await props.retryFunction();
}
</script>
