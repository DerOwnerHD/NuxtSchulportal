<template>
    <div
        class="aside-backdrop h-screen w-screen fixed top-0 left-0 z-[5]"
        :menu="menu"
        @click="closeMenu"
        v-if="useSheetState().value.open.includes(menu)">
        <aside
            class="fixed w-screen rounded-t-3xl overflow-y-auto overflow-x-hidden max-h-[80vh] focus:outline-none"
            @touchstart="startDrag"
            @touchmove="updateDrag"
            @touchend="endDrag"
            :menu="menu">
            <header id="bottom-sheet-header" class="flex sticky top-0 place-content-center py-3 pb-3.5 z-[5]">
                <div class="w-10 h-1.5 rounded-full"></div>
            </header>
            <main class="text-center mb-5">
                <SheetsVPlanSheet v-if="menu === 'vplan'" @close="closeMenu(null, 100)"></SheetsVPlanSheet>
                <SheetsVPlanNewsSheet v-if="menu === 'vplan-news'" @close="closeMenu(null, 100)"></SheetsVPlanNewsSheet>
                <SheetsSPlanSheet v-if="menu === 'splan'" @close="closeMenu(null, 100)"></SheetsSPlanSheet>
                <SheetsMessagesSheet v-if="menu === 'messages'" @close="closeMenu(null, 100)"></SheetsMessagesSheet>
                <SheetsMyLessonsSheet v-if="menu === 'lessons'" @close="closeMenu(null, 100)"></SheetsMyLessonsSheet>
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
        await useWait(500);
        this.element.animate([{ transform: `translateY(${this.element.clientHeight}px)` }, { transform: `translateY(0px)` }], {
            easing: "ease-in-out",
            duration: 500
        });
        setTimeout(() => (this.element.style.transform = ""), 500);
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
    data() {
        return {
            dragStartTime: 0,
            change: 0,
            changeSinceLastUpdate: 0,
            distanceFromTop: 0,
            start: 0,
            moving: false
        };
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
            const target = event.target as HTMLElement;
            if (target.closest("#sheet-inner-content")) return;

            this.start = Math.floor(event.changedTouches[0].screenY);
            this.change = 0;
            this.changeSinceLastUpdate = 0;
            this.distanceFromTop = this.element.getBoundingClientRect().top;
            this.dragStartTime = Date.now();
        },
        updateDrag(event: TouchEvent) {
            const target = event.target as HTMLElement;
            if (target.closest("#sheet-inner-content")) return;
            // Scrolling inside the container has to be prevented when dragging the box
            event.preventDefault();

            const elementType = (event.target as Element).nodeName;
            if (this.moving || elementsIgnoringMove.includes(elementType)) return;

            const change = Math.floor(event.changedTouches[0].screenY - this.start);

            this.changeSinceLastUpdate = event.changedTouches[0].screenY - this.change;
            if (this.changeSinceLastUpdate < 0) this.dragStartTime = Date.now();

            this.element.style.transform = `translateY(${Math.max(change, -5)}px)`;
            this.change = change;
        },
        endDrag(event: TouchEvent) {
            const target = event.target as HTMLElement;
            if (target.closest("#sheet-inner-content")) return;
            if (this.moving) return;
            // The drag is also detected when clicking on a button
            // in the top row - so we shall not run the actions in here
            if ((event.target as Element).closest("button[action=close]")) return;
            this.moving = true;
            setTimeout(() => (this.moving = false), 510);
            // The sheet shall be closed when the user has moved it down
            // by at least half - if not, we move it back up again
            if (this.element.clientHeight - this.change < this.element.clientHeight / 2 && this.closable === "1") {
                this.moving = false;
                this.closeMenu(null, 0);
            } else {
                this.element.style.transform = "";
                this.dragStartTime = 0;
            }
            this.start = 0;
        },
        closeMenu(event?: Event | null, waitTime?: number) {
            if (event != undefined) {
                const target = event.target as HTMLElement;
                if (!target.classList.contains("aside-backdrop")) return;
            }
            if (this.moving) return;

            // When called by a button we wait 200ms, so we can fully see the button animation
            setTimeout(() => {
                const timePerPixel = (Date.now() - this.dragStartTime) / this.change;
                const duration = this.dragStartTime === 0 ? 500 : Math.floor(timePerPixel * (this.element.clientHeight - this.change));
                this.element.animate(
                    [
                        {
                            transform: `translateY(${
                                this.dragStartTime === 0 ? 0 : this.element.getBoundingClientRect().top - this.distanceFromTop
                            }px)`
                        },
                        { transform: `translateY(${this.element.clientHeight + 20}px)` }
                    ],
                    {
                        duration: Math.max(duration, 1),
                        easing: "ease-in-out",
                        fill: "forwards"
                    }
                );
                this.moving = true;
                this.backdrop.removeAttribute("open");
                // This needs to be seperated as it's taking
                // some time for the reactive effects to take place
                setTimeout(() => {
                    useOpenSheet(this.menu);
                }, duration);
            }, waitTime || 0);
        }
    }
});
</script>

<style scoped>
aside {
    background: linear-gradient(to bottom, #1e1e1e, #121212);
    bottom: -5px;
    transition: transform 20ms ease;
    z-index: 5;
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
