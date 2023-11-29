<template>
    <div class="relative">
        <div class="flex w-screen items-center justify-center">
            <ClientOnly>
                <font-awesome-icon class="mr-2" :icon="['fas', 'envelope-open-text']"></font-awesome-icon>
            </ClientOnly>
            <h1>Direktnachrichten</h1>
        </div>
        <ClientOnly>
            <font-awesome-icon class="rounded-button absolute right-5 top-[-0.5rem] !p-2" :icon="['fas', 'up-right-from-square']"></font-awesome-icon>
        </ClientOnly>
        <div class="grid place-content-center py-2" v-if="!conversations || !conversations[selected]">
            <div class="error" v-if="appErrors.conversations">
                <span>{{ appErrors.conversations }}</span>
            </div>
            <div class="spinner" style="--size: 2rem" v-else></div>
        </div>
        <main id="sheet-inner-content" v-else>
            <div v-if="stage === 0">
                <div class="select" id="conversations-type">
                    <div
                        v-for="group of conversationGroups"
                        :id="group.id"
                        :selected="group.selected ? '' : null"
                        @click="updateTypeSelection(group.id)">
                        <ClientOnly>
                            <font-awesome-icon :icon="group.icon"></font-awesome-icon>
                        </ClientOnly>
                        {{ group.name }}
                    </div>
                </div>
                <div class="relative overflow-hidden">
                    <div class="error" v-if="!conversations || !conversations[selected]">
                        <span>Fehler</span>
                    </div>
                    <ConversationPreview v-else :type="selected" :sheet="true"></ConversationPreview>
                </div>
            </div>
        </main>
    </div>
</template>

<script lang="ts">
export default defineComponent({
    name: "MessagesSheet",
    emits: ["close"],
    data() {
        return {
            appErrors: useAppErrors(),
            conversationGroups: [
                { id: "favorites", name: "Favoriten", icon: ["fas", "star"], selected: false },
                { id: "groups", name: "Gruppen", icon: ["fas", "people-group"], selected: false },
                { id: "personal", name: "Persönlich", icon: ["fas", "user-group"], selected: true }
            ],
            selected: "personal",
            conversations: useState<{ [type: string]: MoodleConversation[] }>("moodle-conversations"),
            credentials: useMoodleCredentials(),
            stage: 0
        };
    },
    methods: {
        async updateTypeSelection(id: string) {
            const sheet = document.querySelector(`aside[menu="messages"]`);
            if (!(sheet instanceof HTMLElement) || sheet.hasAttribute("moving")) return;

            const previousHeight = sheet.clientHeight;
            sheet.style.height = `${previousHeight}px`;

            // We have to limit the size of the list, it
            // for some reason doesn't work when just setting
            // it normally using overflow css property
            const list = sheet.querySelector("ul");
            if (!list) return;

            list.style.maxHeight = "";

            this.conversationGroups.forEach((x) => (x.selected = false));
            const selected = this.conversationGroups.find((x) => x.id === id);
            if (!selected) return;
            selected.selected = true;
            this.selected = selected.id;

            sheet.setAttribute("moving", "");

            await useWait(1);
            sheet.style.height = "";
            const newHeight = sheet.clientHeight;
            sheet.style.height = `${Math.max(newHeight, previousHeight)}px`;

            let movements = [{ transform: "translateY(0px)" }, { transform: `translateY(${previousHeight - newHeight}px)` }];

            if (newHeight > previousHeight)
                movements = [{ transform: `translateY(${newHeight - previousHeight}px)` }, { transform: "translateY(0px)" }];

            const animation = sheet.animate(movements, {
                duration: 500,
                easing: "ease-in-out"
            });

            await useWait(490);
            animation.cancel();
            sheet.removeAttribute("moving");
            sheet.style.height = "";

            list.style.maxHeight = `${Math.floor(window.innerHeight - list.getBoundingClientRect().top)}px`;
        }
    }
});
</script>
