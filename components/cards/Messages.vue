<template>
    <main>
        <div class="mb-2 relative rounded-2xl w-[90%] mx-[5%] z-0 gradient-border max-w-[18rem]">
            <div>
                <div class="text-center py-2" v-if="!conversations.length">
                    <p>Wird geladen</p>
                    <small>Dauert zu lange?</small>
                    <br>
                    <button class="button-with-symbol" onclick="location.reload()">
                        <ClientOnly>
                            <font-awesome-icon :icon="['fas', 'arrow-rotate-right']"></font-awesome-icon>
                        </ClientOnly>
                        <span>Neu laden</span>
                    </button>
                </div>
                <ul v-else>
                    <li v-for="conversation of conversations.slice(0, 3)">
                        <img :src="conversation.icon || conversation.members[0].avatar.small || 'https://i.imgur.com/HaVDp4T.png'">
                        <div>
                            <p>{{ conversation.name || conversation.members[0].name || "<Unbenannt>" }}</p>
                            <p>{{ conversation.messages[0].text.replace(/(<([^>]+)>)/ig, "") || "Keine Textnachricht" }}</p>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
        <p v-if="conversations.length" class="text-sm text-center mb-1">Insgesamt {{ conversations.length }} Chats</p>
    </main>
    <footer>
        <button>
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'chevron-down']"></font-awesome-icon>
            </ClientOnly>
            <span>Alle Chats anzeigen</span>
        </button>
    </footer>
</template>

<script lang="ts">
interface MoodleConversation {
    id: number;
    name: string;
    subname: string | null;
    icon: string | null;
    type: number;
    memberCount: number;
    muted: boolean;
    favorite: boolean;
    unread: number | null;
    members: MoodleMember[];
    messages: MoodleMessage[];
    canDeleteMessagesForEveryone: boolean;
}
interface MoodleMessage {
    id: number;
    author: number;
    text: string;
    timestamp: number;
}
interface MoodleMember {
    id: number;
    name: string;
    profile: string;
    avatar: {
        small: string;
        default: string;
    };
    online: boolean | null;
    showStatus: boolean;
    blocked: boolean;
    contact: boolean;
    deleted: boolean;
    abilities: {
        message: boolean;
        messageIfBlocked: boolean;
    };
    requiresContact: boolean;
    contactRequests: [];
}
export default defineComponent({
    name: "Messages",
    mounted() {
        this.fetchMessages();
    },
    data() {
        const conversations: MoodleConversation[] = [];
        return {
            conversations
        }
    },
    methods: {
        async fetchMessages() {
            const conversations = await useConversations();
            if (!Array.isArray(conversations))
                return;
            this.conversations = conversations;
        }
    }
});
</script>
<style scoped>
li {
    @apply flex w-full py-2 items-center;
    img {
        @apply rounded-full aspect-square w-10 h-10 mx-2;
    }
    div {
        p {
            @apply whitespace-nowrap overflow-hidden text-ellipsis;
        }
        p:nth-child(2) {
            font-size: 0.9rem;
        }
        max-width: 75%;
        flex: 2;
    }
}
li:not(:last-child) {
    border-bottom: solid 1px;
    border-image: linear-gradient(90deg, #00000000 10%, #ffffff 50%, #00000000 90%) 1;
}
li:first-child {
    @apply rounded-t-2xl;
}
li:last-child {
    @apply rounded-b-2xl;
}
</style>
