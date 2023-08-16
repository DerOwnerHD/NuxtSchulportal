<template>
    <main>
        <div id="table" class="w-[90%] mx-[5%] rounded-2xl mb-2 text-white shadow-md z-0 relative gradient-border">
            <div class="flex rounded-[inherit] py-2 px-0"></div>
        </div>
        <p class="text-sm text-center mb-1">Aktualisert vor <span id="vplan-refresh"></span></p>
    </main>
    <footer>
        <button>
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'chevron-down']"></font-awesome-icon>
            </ClientOnly>
            <span>Details</span>
        </button>
        <button>
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'arrow-rotate-right']"></font-awesome-icon>
            </ClientOnly>
            <span>Neu laden</span>
        </button>
    </footer>
</template>

<script>
export default defineComponent({
    name: "VPlan"
});
</script>

<style scoped>
#table {
    > div > div {
        @apply basis-[50%];
        header {
            text-align: center;
        }
        main {
            font-size: 0.8rem;
            p {
                text-align: center;
            }
            li {
                list-style: disc inside;
                line-break: loose;
                margin-left: 1rem;
                font-size: 0.75rem;
            }
        }
    }
    > div > div:not(:first-child) {
        border-left: solid 1px;
        border-image: linear-gradient(#00000000 0%, #ffffff 50%, #00000000 100%) 1;
    }
}
small {
    font-weight: 100;
}
#table::before {
    @apply z-[-1] m-[-3px] bottom-0 top-0 left-0 right-0 absolute drop-shadow-xl rounded-[inherit] content-[""];
    background: var(--gradient);
}
</style>
