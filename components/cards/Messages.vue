<template>
    <main v-if="cards.includes('messages')">
        <GradientBorder class="mb-2 rounded-2xl w-[90%] mx-[5%] max-w-[18rem]">
            <div>
                <div class="grid place-content-center py-2" v-if="conversations == undefined || !conversations.all.length">
                    <div class="error" v-if="errors['conversations'] != null">
                        <span>{{ errors["conversations"] }}</span>
                    </div>
                    <div v-else class="spinner" style="--size: 2rem"></div>
                </div>
                <ConversationPreview v-else type="all" :splice="3"></ConversationPreview>
            </div>
        </GradientBorder>
        <p class="card-main-description" v-if="conversations && conversations.all.length">Insgesamt {{ conversations.all.length }} Chat(s)</p>
    </main>
    <footer>
        <button @click="useOpenSheet('messages', true)">
            <font-awesome-icon :icon="['fas', 'chevron-down']"></font-awesome-icon>
            <span>Alle Chats anzeigen</span>
        </button>
    </footer>
</template>

<script setup lang="ts">
const conversations = useState<{ [type: string]: MoodleConversation[] }>("moodle-conversations");
const cards = useOpenCards();
const errors = useAppErrors();
</script>
