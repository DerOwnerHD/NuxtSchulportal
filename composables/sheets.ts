const MAX_SHEET_HEIGHT_PERCENTAGE = 0.8;
export const useSheetTransition = async (sheet: string, execute: () => Promise<any> | any, wait: number = 500) => {
    const element = document.querySelector(`aside[menu=${sheet}]`);
    if (!(element instanceof HTMLElement)) throw new TypeError(`Sheet ${sheet} not found in DOM`);
    const previousHeight = element.clientHeight;
    // This is required so the element does not change size for one
    // frame once the content is switched and the animation is started
    await execute();
    await nextTick();
    const height = Math.min(element.clientHeight, window.innerHeight * MAX_SHEET_HEIGHT_PERCENTAGE);
    element.style.height = previousHeight + "px";
    element.animate([{ height: `${previousHeight}px` }, { height: `${height}px` }], {
        duration: wait,
        easing: "ease-in-out"
    });
    await nextTick();
    element.style.height = "";
};
