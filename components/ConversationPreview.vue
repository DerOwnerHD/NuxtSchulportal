<template>
    <p v-if="!conversations[type].length">Keine Chats gefunden</p>
    <p v-else-if="sheet">{{ conversations[type].length }} Chat(s)</p>
    <ul class="overflow-auto">
        <li v-for="conversation of conversations[type].slice(0, splice || conversations[type].length)
        .map((conversation) => { return { 
            ...conversation, 
            messages: conversation.messages.map((message) => { 
                return { 
                    ...message, 
                    text: message.text.replace(/(<([^>]+)>)/ig, '') 
                }
            })
        }})">
            <aside class="relative">
                <span class="absolute right-1 top-0 news-icon" v-if="conversation.unread">{{ conversation.unread }}</span>
                <img :src="conversation.icon || proxyUserAvatar(conversation.members[0].avatar.small) || 'moodle-default.png'">
            </aside>
            <main>
                <p>
                    <b v-if="!conversation.name && conversation.members[0].id === moodleCredentials.user">[Notizen]</b>
                    {{ conversation.name || conversation.members[0].name || "<Unbenannt>" }}
                </p>
                <p v-if="conversation.messages[0].text !== ''">
                    <b>{{ conversation.messages[0].author === moodleCredentials.user ? "Ich: " : "" }}</b>
                    {{ conversation.messages[0].text }}
                </p>
                <p v-else>
                    <ClientOnly>
                        <font-awesome-icon :icon="['far', 'image']"></font-awesome-icon>
                    </ClientOnly>
                    <span class="ml-1">Andere Medien</span>
                </p>
            </main>
        </li>
    </ul>
</template>

<script lang="ts">
export default defineComponent({
    name: "ConversationPreview",
    props: {
        type: {
            required: true,
            type: String
        },
        splice: {
            required: false,
            type: Number
        },
        sheet: {
            required: false,
            type: Boolean
        }
    },
    async mounted() {
        if (!this.sheet) return;
        const list = document.querySelector("aside[menu=messages] ul") as HTMLElement;
        if (!list) return;
        setTimeout(() => list.style.maxHeight = `${Math.floor(window.innerHeight - list.getBoundingClientRect().top)}px`, 1500);
    },
    data() {
        return {
            conversations: useState<{[type: string]: MoodleConversation[]}>("moodle-conversations"),
            moodleCredentials: useMoodleCredentials(),
            credentials: useCredentials<Credentials>()
        };
    },
    methods: {
        proxyUserAvatar(avatar?: string) {

            if (!avatar) return null;
            const path = avatar.split(".schule.hessen.de")[1];
            if (!/\/pluginfile.php\/\d{1,5}\/user\/icon\/sph\/.*/.test(path)) return "/moodle-default.png";
            return `/api/moodle/proxy?cookie=${this.moodleCredentials.cookie}&school=${this.credentials.school}&path=${path}`;

        }
    }
})
</script>

<style scoped>
li {
    @apply flex w-full py-2 items-center text-left;
    img {
        @apply rounded-full aspect-square w-10 h-10 mx-2;
    }
    main {
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