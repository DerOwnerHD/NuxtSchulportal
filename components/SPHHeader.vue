<template>
    <NuxtLink class="flex px-2 sticky justify-center top-0 z-20" to="/">
        <div class="container h-12 relative w-12 rounded-full z-[2]">
            <div class="pt-1 flex justify-between h-full w-full">
                <span class="text-3xl">SP</span>
                <span class="rounded-full text-sm px-1 h-fit mt-1 bg-[#94979f]">H</span>
            </div>
        </div>
        <div class="h-12 blurred-background rounded-r-full ml-[-1.5rem] pr-5 pl-9 grid place-content-center text-2xl backdrop-blur-md">
            <span class="glow relative flex">Schulportal<span class="text-sm top-0.5 ml-0.5 relative">HESSEN</span></span>
        </div>
    </NuxtLink>
</template>

<style scoped>
.glow {
    filter: drop-shadow(0px 0px 8px white);
}
.container {
    filter: drop-shadow(0px 0px 16px #2ba3e0);
    background: linear-gradient(to bottom, #18d5ee, #397ed5);
    > div {
        clip-path: circle(50% at 50% 50%);
    }
}
</style>
