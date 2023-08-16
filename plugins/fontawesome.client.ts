import { library, config } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
    faHourglassHalf,
    faBook,
    faCalendarDays,
    faEnvelopeOpenText,
    faXmark,
    faEye,
    faEyeSlash,
    faArrowRightFromBracket,
    faCheck,
    faArrowRotateRight,
    faExpand,
    faChevronDown,
    faRepeat,
    faChild,
    faUser,
    faClipboard,
    faUpRightFromSquare,
    faHandsHoldingChild,
    faMagnifyingGlass
} from "@fortawesome/free-solid-svg-icons";
import { faJsfiddle } from "@fortawesome/free-brands-svg-icons";

config.autoAddCss = false;

library.add(
    faHourglassHalf,
    faBook,
    faCalendarDays,
    faEnvelopeOpenText,
    faXmark,
    faEye,
    faEyeSlash,
    faArrowRightFromBracket,
    faCheck,
    faArrowRotateRight,
    faExpand,
    faJsfiddle,
    faChevronDown,
    faRepeat,
    faChild,
    faUser,
    faClipboard,
    faUpRightFromSquare,
    faHandsHoldingChild,
    faMagnifyingGlass
);
export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component("font-awesome-icon", FontAwesomeIcon);
});
