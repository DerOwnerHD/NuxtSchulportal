<template>
    <div class="flex w-full justify-center py-2">
        <div class="rounded-full p-1 flex backdrop-blur-sm bg-[#ffffff50] w-fit relative" id="container" :select="props.id">
            <div class="absolute h-6 bg-white rounded-full shadow-md" id="highlighter"></div>
            <div
                v-for="(option, index) of props.options"
                class="option rounded-full px-2 z-[1]"
                :value="option.value"
                :selected="selectedOption === index"
                @click="switchSelection(option.value, index)">
                {{ option.name }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineEmits(["select"]);
const selectedOption = ref(0);
const props = defineProps<{ options: { value: string; name: string; init_selected?: boolean }[]; id: string }>();
onMounted(() => {
    const selected = props.options.findIndex((x) => x.init_selected);
    if (selected === -1) return switchSelection(props.options[0]?.value, 0);
    switchSelection(props.options[selected]?.value, selected);
});
async function switchSelection(value: string, index: number) {
    const container = document.querySelector(`#container[select=${props.id}]`);
    if (container === null) return console.error("Select container in which user clicked does not exist?");
    const highlighter = container.querySelector("#highlighter");
    const option = container.querySelector(`.option[value=${value}]`);
    if (!(highlighter instanceof HTMLElement) || !(option instanceof HTMLElement))
        return console.error("No highlighter or selected option for select box?");
    const boxOffset = container.getBoundingClientRect().left;
    const currentOffset = highlighter.getBoundingClientRect().left;
    const targetOffset = option.getBoundingClientRect().left;
    const currentWidth = highlighter.clientWidth;
    const targetWidth = option.clientWidth;
    highlighter.animate(
        [
            { width: currentWidth + "px", left: currentOffset - boxOffset + "px" },
            { width: targetWidth + "px", left: targetOffset - boxOffset + "px" }
        ],
        { duration: 300, fill: "forwards", easing: "ease-out" }
    );
    selectedOption.value = index;
}
</script>

<style scoped>
#container {
    background: linear-gradient(#ffffff80, #ffffff30);
    border-top: solid 1px #b5b5b5;
}
.option[selected="true"] {
    color: black;
}
.option {
    transition: color 400ms;
}
</style>
