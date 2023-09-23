<template>
    <button id="secret-button" class="fixed top-0 right-0 p-1 pb-2 pl-2 grid place-content-center opacity-0" @click="show">
        <ClientOnly>
            <font-awesome-icon :icon="['fas', 'lock']"></font-awesome-icon>
        </ClientOnly>
    </button>
    <dialog id="secrets">
        <button class="button-with-symbol" @click="close">
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'xmark']"></font-awesome-icon>
            </ClientOnly>
            <span>Schließen</span>
        </button>
    </dialog>
</template>

<script>
export default defineComponent({
    methods: {
        show() {
            const button = document.querySelector("#secret-button");
            const dialog = document.querySelector("dialog#secrets");
            if (!(button instanceof HTMLButtonElement) || !(dialog instanceof HTMLDialogElement)) return;
            button.style.opacity = "1";
            dialog.showModal();
        },
        close() {
            const button = document.querySelector("#secret-button");
            const dialog = document.querySelector("dialog#secrets");
            if (!(button instanceof HTMLButtonElement) || !(dialog instanceof HTMLDialogElement)) return;
            button.style.opacity = "0";
            dialog.close();
        }
    }
});
</script>

<style scoped>
#secret-button {
    z-index: 9;
    border-left: solid 1px white;
    border-bottom: solid 1px white;
    border-bottom-left-radius: 1rem;
}
dialog {
    background: black;
}
</style>
