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
    faChevronUp,
    faRepeat,
    faChild,
    faUser,
    faClipboard,
    faUpRightFromSquare,
    faHandsHoldingChild,
    faMagnifyingGlass,
    faStar,
    faPeopleGroup,
    faUserGroup,
    faCloud,
    faClock,
    faUserSlash,
    faLocationDot,
    faInfo,
    faAddressBook,
    faArrowRight,
    faTrash,
    faBell,
    faLock
} from "@fortawesome/free-solid-svg-icons";
import { faImage } from "@fortawesome/free-regular-svg-icons";
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
    faChevronUp,
    faRepeat,
    faChild,
    faUser,
    faClipboard,
    faUpRightFromSquare,
    faHandsHoldingChild,
    faMagnifyingGlass,
    faImage,
    faStar,
    faPeopleGroup,
    faUserGroup,
    faCloud,
    faClock,
    faUserSlash,
    faLocationDot,
    faInfo,
    faAddressBook,
    faArrowRight,
    faTrash,
    faBell,
    faLock
);
export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component("font-awesome-icon", FontAwesomeIcon);
});
