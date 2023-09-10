<template>
    <div class="info-dialog-wrapper fixed bottom-[-6rem] grid place-content-center w-screen z-[2]">
        <aside class="w-72 h-16 rounded-full gradient-border grid relative overflow-hidden">
            <div class="h-[inherit] flex items-center justify-center">
                <img v-if="data?.icon" class="h-10 mr-2" :src="data.icon">
                <div>
                    <h2>{{ data?.header }}</h2>
                    <small class="block" v-if="data?.details">{{ data.details }}</small>
                </div>
            </div>
        </aside>
    </div>
</template>

<script lang=ts>
export default defineComponent({
    name: "InfoDialog",
    data() {
        return {
            data: useInfoDialog()
        }
    },
    computed: {
        element() {
            if (this.data === null) return null;
            return document.querySelector(`.info-dialog-wrapper`);
        }
    },
    async mounted() {
        if (this.data === null) return;
        const steps = [
            { transform: "translateY(0rem)" },
            { transform: "translateY(-7rem)" }
        ];
        this.element?.animate(steps, { duration: 500, easing: "ease-in-out", fill: "forwards" });
        await useWait(this.data.disappearAfter + 500);
        this.element?.animate(steps.reverse(), { duration: 500, easing: "ease-in-out", fill: "forwards" });
        await useWait(500);
        useInfoDialog().value = null;
        this.element?.remove();
    }
});
</script>

<style scoped>
aside {
    
    --gradient: linear-gradient(315deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);
}
aside::before {
    @apply z-[-1] m-[-2px] bottom-0 top-0 left-0 right-0 absolute drop-shadow-xl rounded-[inherit] content-[""] w-[inherit] place-self-center;
    width: calc(18rem + 4px);
}
</style>