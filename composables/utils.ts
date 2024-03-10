export const useWait = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const useOpenCards = () => useState<string[]>("cards-open");

export const DEFAULT_ERRORS: { [status: string]: string } = {
    "400": "Bad Request",
    "401": "Unauthorized",
    "403": "Forbidden",
    "404": "Not Found",
    "405": "Method Not Allowed",
    "410": "Gone",
    "429": "Too Many Requests",
    "500": "Internal Server Error",
    "503": "Service Not Available"
};

export const infoDialogs: { [name: string]: InfoDialog } = {
    LOGIN: {
        disappearAfter: 2000,
        header: "Anmeldung erfolgreich",
        icon: "done.png"
    },
    AUTOMATIC_LOGIN: {
        disappearAfter: 2000,
        header: "Erneute Anmeldung erfolgreich",
        icon: "done.png"
    },
    AUTOMATIC_LOGIN_ERROR: {
        disappearAfter: 2000,
        header: "Anmeldung fehlgeschlagen",
        details: `Versuche es erneut oder melde dich ab`,
        icon: "error.png"
    }
};

interface InfoDialog {
    header: string;
    details?: string;
    disappearAfter: number;
    icon?: string;
}
export const useInfoDialog = () => useState<InfoDialog | null>("info-dialog");
export const openLink = (link: string) => window.open(link, "_blank");
export const addZeroToNumber = (number: number) => String(number).padStart(2, "0");

export const useCards = () => useState<{ id: string; name: string; gradient: string; icon: string[]; index: number }[]>("cards");

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
