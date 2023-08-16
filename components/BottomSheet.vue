<template>
    <aside class="fixed w-full rounded-t-3xl" @touchstart="startDrag" @touchmove="updateDrag" @touchend="endDrag" :menu="menu">
        <header class="flex place-content-center py-2 rounded-md">
            <div class="w-10 h-1.5 rounded-full"></div>
            <button
                v-if="closable === '1'"
                action="close"
                @mousedown="closeMenu(200)"
                class="absolute right-5 text-white w-9 h-9 grid place-content-center rounded-full drop-shadow-sm hover:active:scale-75">
                <ClientOnly>
                    <font-awesome-icon class="text-2xl" :icon="['fas', 'xmark']"></font-awesome-icon>
                </ClientOnly>
            </button>
        </header>
        <main class="text-center mb-5">
            <SheetsLoginSheet v-if="menu === 'login'" @close="closeMenu(100)"></SheetsLoginSheet>
        </main>
    </aside>
</template>

<script lang="ts">
const elementsIgnoringMove: string[] = [];
export default defineComponent({
    name: "BottomSheet",
    props: {
        menu: {
            type: String,
            required: true
        },
        closable: {
            type: String,
            required: false,
            default: "1"
        }
    },
    computed: {
        element(): HTMLElement {
            return document.querySelector(`aside[menu=${this.menu}]`) as HTMLElement;
        }
    },
    methods: {
        startDrag(event: TouchEvent) {
            this.element.setAttribute("start", String(event.changedTouches[0].screenY));
            this.element.removeAttribute("change");
        },
        updateDrag(event: TouchEvent) {
            const elementType = (event.target as Element).nodeName;
            if (this.element.hasAttribute("moving") || elementsIgnoringMove.includes(elementType)) return;
            const change = event.changedTouches[0].screenY - parseInt(this.element.getAttribute("start") || "0");
            this.element.style.transform = "translateY(" + Math.max(change, -5) + "px)";
            this.element.setAttribute("change", String(change));
        },
        endDrag(event: TouchEvent) {
            if (this.element.hasAttribute("moving")) return;
            // The drag is also detected when clicking on a button
            // in the top row - so we shall not run the actions in here
            if ((event.target as Element).closest("button[action=close]")) return;
            this.element.setAttribute("moving", "");
            setTimeout(() => this.element.removeAttribute("moving"), 510);
            // The sheet shall be closed when the user has moved it down
            // by at least half - if not, we move it back up again
            if (
                this.element.clientHeight - parseInt(this.element.getAttribute("change") || "0") < this.element.clientHeight / 2 &&
                this.closable === "1"
            )
                this.element.style.transform = `translateY(${this.element.clientHeight + 20}px)`;
            else this.element.style.transform = "";
            this.element.removeAttribute("start");
        },
        closeMenu(waitTime: number) {
            // When called by a button we wait 200ms so we can fully see the button animation
            setTimeout(() => {
                this.element.style.transform = `translateY(${this.element.clientHeight + 20}px)`;
                this.element.setAttribute("moving", "");
                setTimeout(() => {
                    this.element.removeAttribute("moving");
                    this.element.remove();
                }, 510);
            }, waitTime);
        }
    }
});
</script>

<style scoped>
aside {
    background: linear-gradient(to bottom, #1e1e1e, #121212);
    padding-bottom: 5rem;
    bottom: -5px;
    transition: transform 50ms ease;
    z-index: 2;
}

aside[moving] {
    transition: transform 500ms ease-in-out;
    transition-delay: 100ms;
}

header > div {
    background: #454746;
}

header > button {
    background: #f1f2f4;
    color: #4e5760;
    transition: transform 0.2s ease-out;
}
</style>
