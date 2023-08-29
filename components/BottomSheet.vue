<template>
    <div class="aside-backdrop h-screen w-screen fixed top-0 left-0 z-[2]" :menu="menu" @click="closeMenu">
        <aside
            class="fixed w-screen rounded-t-3xl focus:outline-none"
            @touchstart="startDrag"
            @touchmove="updateDrag"
            @touchend="endDrag"
            :menu="menu">
            <header class="flex place-content-center py-2 rounded-md">
                <div class="w-10 h-1.5 rounded-full"></div>
            </header>
            <main class="text-center mb-5">
                <SheetsMessagesSheet v-if="menu === 'messages'" @close="closeMenu(null, 100)"></SheetsMessagesSheet>
            </main>
        </aside>
    </div>
</template>

<script lang="ts">
const elementsIgnoringMove: string[] = [];
export default defineComponent({
    name: "BottomSheet",
    async mounted() {
        this.element.style.transform = `translateY(9999px)`;
        await new Promise((resolve) => setTimeout(resolve, 500));
        this.element.animate([{ transform: `translateY(${this.element.clientHeight}px)` }, { transform: `translateY(0px)` }], {
            easing: "ease-in-out",
            duration: this.element.clientHeight * 2.5
        });
        setTimeout(() => (this.element.style.transform = ""), this.element.clientHeight * 2.5);
        this.backdrop.setAttribute("open", "");
    },
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
        },
        backdrop(): HTMLDivElement {
            return document.querySelector(`.aside-backdrop[menu=${this.menu}]`) as HTMLDivElement;
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
                this.closeMenu(null, 100);
            else this.element.style.transform = "";
            this.element.removeAttribute("start");
        },
        closeMenu(event?: Event | null, waitTime?: number) {
            if (event != undefined) {
                const target = event.target as HTMLElement;
                if (!target.classList.contains("aside-backdrop")) return;
            }
            // When called by a button we wait 200ms so we can fully see the button animation
            setTimeout(() => {
                this.element.style.transform = `translateY(${this.element.clientHeight + 20}px)`;
                this.element.setAttribute("moving", "");
                this.backdrop.removeAttribute("open");
                // This needs to be seperated as it's taking
                // some time for the reactive effects to take place
                setTimeout(() => {
                    useSheet(this.menu);
                }, 500);
            }, waitTime || 0);
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
.aside-backdrop {
    background: transparent;
    transition: background 500ms;
}
.aside-backdrop[open] {
    background: #00000080;
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
