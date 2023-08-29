<template>
    <div class="relative">
        <h1>Direktnachrichten</h1>
        <ClientOnly>
            <font-awesome-icon class="rounded-button absolute right-5 top-0 !p-2" :icon="['fas', 'up-right-from-square']"></font-awesome-icon>
        </ClientOnly>
        <div class="error" v-if="appErrors['moodle-conversations'] != null">
            <span>{{ appErrors["moodle-conversations"] }}</span>
        </div>
    </div>
</template>

<script lang="ts">
export default defineComponent({
    name: "MessagesSheet",
    emits: ["close"],
    data() {
        return {
            appErrors: useState<{ [app: string]: string | null }>("app-errors")
        };
    }
});
</script>
