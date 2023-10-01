<template>
    <dialog id="notifications" class="w-[80vw] rounded-lg focus:outline-none">
        <div class="z-10 rounded-lg text-center grid place-content-center">
            <div v-if="!supportsWorkers">
                <span class="info mb-1">Bei Safari muss die Seite auf den<br />Startbildschrim hinzugefügt werden</span>
                <p>Benachrichtigungen werden von<br />deinem Browser nicht unterstützt</p>
            </div>
            <div class="error" v-else-if="error">
                <span>{{ error }}</span>
            </div>
            <div v-else class="w-[inherit]">
                <div v-if="!credentials">
                    <p>Dafür musst du angemeldet sein</p>
                </div>
                <div v-if="permission === 'denied'">
                    <p>Du hast die Anfrage für<br />Benachrichtigungen abgelehnt</p>
                </div>
                <div class="grid place-content-center" v-else-if="registration === null || processing">
                    <div class="spinner justify-self-center" style="--size: 2rem"></div>
                    <p v-if="progressText !== ''">{{ progressText }}</p>
                </div>
                <div v-else-if="!registration">
                    <span class="warning mb-1">Speichert Autologin-Token<br />auf dem Server (nicht Passwort)</span>
                    <p>Du hast noch keine<br />Benachrichtigungen registriert</p>
                    <button class="button-with-symbol" @click="register">
                        <div v-if="!awaitingDecision">
                            <font-awesome-icon :icon="['fas', 'arrow-right']"></font-awesome-icon>
                            <span>Weiter</span>
                        </div>
                        <span v-else>Warte...</span>
                    </button>
                </div>
                <div v-else-if="registration">
                    <p>Benachrichtigungen sind registriert</p>
                    <button class="button-with-symbol" @click="unregister">
                        <font-awesome-icon :icon="['fas', 'trash']"></font-awesome-icon>
                        <span>Entfernen</span>
                    </button>
                    <button class="button-with-symbol" @click="showEndpoint = !showEndpoint">
                        <font-awesome-icon :icon="['fas', 'chevron-down']"></font-awesome-icon>
                        <span>Details</span>
                    </button>
                </div>
            </div>
            <div class="flex justify-center">
                <button class="button-with-symbol w-fit" @click="closeDialog" v-if="!processing">
                    <font-awesome-icon :icon="['fas', 'xmark']"></font-awesome-icon>
                    <span>Schließen</span>
                </button>
            </div>
            <pre
                v-if="showEndpoint"
                class="bg-black text-left rounded-md h-24 w-[80%] mx-[10%] mt-2 overflow-scroll px-2"
                v-html="syntaxHighlight(subscription)"></pre>
        </div>
    </dialog>
</template>

<script lang="ts">
export default defineComponent({
    name: "NotificationManager",
    data() {
        let registration: ServiceWorkerRegistration | null | undefined;
        let subscription: PushSubscription | null | undefined;
        return {
            registration,
            subscription,
            supportsWorkers: "serviceWorker" in window.navigator,
            processing: false,
            awaitingDecision: false,
            error: "",
            credentials: useCredentials<Credentials>(),
            permission: Notification.permission,
            showEndpoint: false,
            progressText: ""
        };
    },
    computed: {
        dialog() {
            const dialog = document.querySelector("dialog#notifications");
            if (!(dialog instanceof HTMLDialogElement)) return;
            return dialog;
        }
    },
    methods: {
        async loadRegistration() {
            if (!this.supportsWorkers) return;
            this.registration = await window.navigator.serviceWorker.getRegistration();
        },
        async loadSubscription() {
            if (!this.supportsWorkers || !this.registration) return;
            this.subscription = await this.registration?.pushManager.getSubscription();
        },
        closeDialog() {
            this.dialog?.close();
            useState("notification-manager").value = false;
        },
        async register() {
            if (this.awaitingDecision) return;

            this.awaitingDecision = true;
            const permission = await Notification.requestPermission();
            this.awaitingDecision = false;
            if (permission === "denied") return (this.permission = "denied");

            this.processing = true;

            try {
                this.progressText = "SW wird angemeldet";
                const registration = await navigator.serviceWorker.register("/sw.js");
                await useWait(1000);
                this.progressText = "Push API wird registriert";
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: useRuntimeConfig().public.vapidPublicKey
                });
                this.progressText = "Token wird generiert";
                const { data: autologin, error: autologinError } = await useFetch("/api/login", {
                    method: "POST",
                    body: {
                        ...useCredentials<Credentials>().value,
                        autologin: true
                    }
                });
                if (autologinError.value !== null) throw autologinError.value.data.error_details || "Serverfehler";
                this.progressText = "Wird auf Server gespeichert";
                const { data, error } = await useFetch("/api/notifications", {
                    method: "POST",
                    body: {
                        endpoint: subscription.endpoint,
                        ...subscription.toJSON().keys,
                        autologin: autologin.value.autologin
                    }
                });
                if (error.value !== null) throw error.value.data?.error_details || "Serverfehler";
            } catch (error: any) {
                console.error(error);
                this.error = error;
                (await navigator.serviceWorker.getRegistration())?.unregister();
            }
            this.processing = false;
            this.progressText = "";
        },
        async unregister() {
            if (!this.registration) return;
            const { data, error } = await useFetch("/api/notifications", {
                method: "DELETE",
                body: {
                    endpoint: this.subscription?.endpoint,
                    ...this.subscription?.toJSON().keys
                }
            });
            if (error.value !== null) return (this.error = error.value.data?.error_details || "Serverfehler");
            await this.registration.unregister();
            location.reload();
        }
    },
    watch: {
        async processing() {
            await this.loadRegistration();
            this.loadSubscription();
        }
    },
    async mounted() {
        this.dialog?.showModal();
        await this.loadRegistration();
        this.loadSubscription();
    }
});
</script>

<style scoped>
dialog {
    background: linear-gradient(315deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);
    > div {
        width: calc(80vw - 6px);
        height: calc(16rem - 6px);
        background: linear-gradient(to bottom, #212121, #080808);
        margin: 3px;
    }
}
dialog::before {
    z-index: 9;
}
h1 {
    @apply text-xl;
}
pre {
    border: solid 2px white;
}
</style>
