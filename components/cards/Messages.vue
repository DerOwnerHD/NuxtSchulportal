<template>
    <main v-if="cardsOpen.includes('messages')">
        <div class="mb-2 relative rounded-2xl w-[90%] mx-[5%] z-0 gradient-border max-w-[18rem] text-white">
            <div>
                <div class="grid place-content-center py-2" v-if="conversations == undefined || !conversations.length">
                    <div class="error" v-if="appErrors['moodle-conversations'] != null">
                        <span>{{ appErrors['moodle-conversations'] }}</span>
                    </div>
                    <div v-else class="spinner" style="--size: 2rem;"></div>
                </div>
                <ul v-else>
                    <li v-for="conversation of conversations.slice(0, 3)
                    .map((conversation) => { return { 
                        ...conversation, 
                        messages: conversation.messages.map((message) => { 
                            return { 
                                ...message, 
                                text: message.text.replace(/(<([^>]+)>)/ig, '') 
                            }
                        })
                    }})">
                        <img :src="conversation.icon || conversation.members[0].avatar.small || 'https://i.imgur.com/HaVDp4T.png'">
                        <div>
                            <p>{{ conversation.name || conversation.members[0].name || "<Unbenannt>" }}</p>
                            <p v-if="conversation.messages[0].text !== ''">{{ conversation.messages[0].text }}</p>
                            <p v-else>
                                <ClientOnly>
                                    <font-awesome-icon :icon="['far', 'image']"></font-awesome-icon>
                                </ClientOnly>
                                <span class="ml-1">Externe Medien</span>
                            </p>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
        <p v-if="conversations && conversations.length" class="text-sm text-center mb-1">Insgesamt {{ conversations.length }} Chats</p>
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
    data() {
        return {
            conversations: useState<MoodleConversation[]>("moodle-conversations"),
            cardsOpen: useState<Array<string>>("cards-open"),
            appErrors: useState<{ [app: string]: string | null }>("app-errors"),
            sheets: useState<{ open: string[] }>("sheets")
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
