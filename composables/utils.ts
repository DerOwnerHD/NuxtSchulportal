/**
 * @deprecated
 */
export function useWait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useScrollabilityStatus = () => useState("scrollability-status", () => true);

export function joinLessonList(lessons: number[]) {
    const lessonSuffix = " Stunde";
    if (!lessons.length) return "";
    if (lessons.length === 1) return `${lessons[0]}.${lessonSuffix}`;
    return `${lessons.at(0)}. - ${lessons.at(-1)}.${lessonSuffix}`;
}

export const easingFunctions = {
    bounce: "cubic-bezier(0.33, 1.35, 0.5, 1)"
};

export const SPH_BASE = "https://start.schulportal.hessen.de";
export const openLink = (link: string) => window.open(link, "_blank");
export const addZeroToNumber = (number: number) => String(number).padStart(2, "0");

export const patterns = {
    USERNAME: /^([A-Z]+\.[A-Z]+(?:-[A-Z]+)?|[A-Z]{3})$/i,
    BIRTHDAY: /^(([12][0-9]|0[1-9]|3[0-1])\.(0[1-9]|11|12)\.(?:19|20)\d{2})$/,
    PW_RESET_CODE: /^([a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4})$/i,
    HEX_CODE: /^[a-f0-9]+$/,
    MOODLE_SESSION: /^[a-z0-9]{10}$/i,
    MOODLE_COOKIE: /^[a-z0-9]{26}$/,
    SESSION_OR_AUTOLOGIN: /^[a-f0-9]{64}$/,
    EMBEDDED_TOKEN: /(?:<input type="hidden" name="token" value=")([a-f0-9]{64})(?:"(?: \/)?>)/i,
    SPH_LOGIN_KEY: /^https:\/\/start.schulportal.hessen.de\/schulportallogin.php?k=[a-f0-9]{96}$/,
    SID: /^[a-z0-9]{26}$/,
    NOTIFICATION_AUTH: /^[a-z0-9_-]{22}$/i,
    NOTIFICATION_P256DH: /^B[a-z0-9_-]+$/i,
    AES_PASSWORD: /^[A-Za-z0-9/\+=]{88}$/,
    TEACHER_NAME_FULL_STRING: /^[^,]+, [^(]+ \([^)]{3,4}\)$/i
};

export const isSecretModeActive = () => useState("secret-mode-enabled", () => false);
