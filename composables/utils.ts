export const useWait = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

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

export const INFO_DIALOGS: { [name: string]: InfoDialog } = {
    AUTOMATIC_LOGIN: {
        disappearAfter: 2000,
        header: "Erneute Anmeldung erfolgreich",
        icon: "done.png"
    },
    AUTOMATIC_LOGIN_ERROR: {
        disappearAfter: 2000,
        header: "Anmeldung fehlgeschlagen",
        details: `Versuche es erneut`,
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

export const addZeroToNumber = (number: number) => String(number).padStart(2, "0");
