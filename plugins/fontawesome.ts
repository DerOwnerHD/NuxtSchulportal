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
    faLock,
    faNewspaper,
    faChevronRight,
    faChevronLeft,
    faPenToSquare,
    faThumbsUp,
    faClipboardList,
    faServer,
    faAt,
    faChalkboardUser,
    faGraduationCap,
    faCar,
    faUpload,
    faDownload,
    faList,
    faCheckToSlot,
    faCodeCompare,
    faKey,
    faBars,
    faCaretRight,
    faGear,
    faLandmark,
    faEarthAmericas,
    faKeyboard,
    faMagnet,
    faFlaskVial,
    faSquareRootVariable,
    faHandsPraying,
    faLanguage,
    faTheaterMasks,
    faHouse,
    faRunning,
    faPen,
    faLongArrowDown,
    faFilePdf,
    faCircleExclamation,
    faLongArrowRight
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
    faChevronRight,
    faChevronLeft,
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
    faLock,
    faNewspaper,
    faPenToSquare,
    faBell,
    faExpand,
    faThumbsUp,
    faClipboardList,
    faServer,
    faAt,
    faChalkboardUser,
    faGraduationCap,
    faCar,
    faLocationDot,
    faLock,
    faUpload,
    faDownload,
    faList,
    faCheckToSlot,
    faCodeCompare,
    faKey,
    faBars,
    faCaretRight,
    faGear,
    faLandmark,
    faMagnet,
    faKeyboard,
    faFlaskVial,
    faSquareRootVariable,
    faHandsPraying,
    faEarthAmericas,
    faLanguage,
    faTheaterMasks,
    faHouse,
    faRunning,
    faPen,
    faLongArrowDown,
    faLongArrowRight,
    faFilePdf,
    faCircleExclamation
);
export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component("font-awesome-icon", FontAwesomeIcon);
});
