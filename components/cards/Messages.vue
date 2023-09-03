<template>
    <main v-if="cardsOpen.includes('messages')">
        <div class="mb-2 relative rounded-2xl w-[90%] mx-[5%] z-0 gradient-border max-w-[18rem] text-white">
            <div>
                <div class="grid place-content-center py-2" v-if="conversations == undefined || !conversations.all.length">
                    <div class="error" v-if="appErrors['conversations'] != null">
                        <span>{{ appErrors["conversations"] }}</span>
                    </div>
                    <div v-else class="spinner" style="--size: 2rem"></div>
                </div>
                <ConversationPreview v-else type="all" :splice="3"></ConversationPreview>
            </div>
        </div>
        <p v-if="conversations && conversations.all.length" class="text-sm text-center mb-1">Insgesamt {{ conversations.all.length }} Chat(s)</p>
    </main>
    <footer>
        <button @click="useSheet('messages')">
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'chevron-down']"></font-awesome-icon>
            </ClientOnly>
            <span>Alle Chats anzeigen</span>
        </button>
    </footer>
</template>

<script lang="ts">
import { MoodleConversation } from "~/composables/apps";
export default defineComponent({
    name: "Messages",
    data() {
        return {
            conversations: useState<{ [type: string]: MoodleConversation[] }>("moodle-conversations"),
            cardsOpen: useState<Array<string>>("cards-open"),
            appErrors: useState<{ [app: string]: string | null }>("app-errors"),
            sheets: useState<{ open: string[] }>("sheets"),
            credentials: useMoodleCredentials()
        };
    }
});
</script>
