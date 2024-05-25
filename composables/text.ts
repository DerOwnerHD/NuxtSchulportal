export const MONTH_NAMES = {
    full: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
    // Whenever something needs these, they could also be done using String.prototype.substring, but this is just a cleaner way of reading it
    short: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
};

type DateStringFormat = "day-month-full" | "day-month-short" | "day-month-number";
export function convertDateStringToFormat(dateString: string, format: DateStringFormat, year?: boolean, padStart: boolean = true) {
    const date = new Date(dateString);
    const day = padStart ? addZeroToNumber(date.getDate()) : date.getDate();
    const month = date.getMonth();
    let dayAndMonth = "";
    switch (format) {
        case "day-month-full":
            dayAndMonth = `${day}. ${MONTH_NAMES.full[month]}`;
            break;
        case "day-month-short":
            dayAndMonth = `${day}. ${MONTH_NAMES.short[month]}`;
            break;
        case "day-month-number":
            dayAndMonth = `${day}. ${MONTH_NAMES.short[month]}`;
            break;
        default:
            throw new ReferenceError(`DateStringFormat ${format} specified for conversion is invalid`);
    }
    return dayAndMonth + (year ? ` ${date.getFullYear()}` : "");
}

const ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;
const RELATIVE_DAYS = [
    { multiplier: 0, name: "heute" },
    { multiplier: -1, name: "gestern" },
    { multiplier: -2, name: "vorgestern" },
    { multiplier: 1, name: "morgen" },
    { multiplier: 2, name: "übermorgen" }
];
export function relativeOrAbsoluteDateFormat(dateString: string, format: DateStringFormat, year?: boolean) {
    const date = new Date(dateString);
    for (const relative of RELATIVE_DAYS) {
        const then = new Date(Date.now() + relative.multiplier * ONE_DAY_IN_MS);
        const day = [date, then].map((x) => x.getDate());
        const month = [date, then].map((x) => x.getMonth());
        const year = [date, then].map((x) => x.getFullYear());
        if (day[0] === day[1] && month[0] === month[1] && year[0] === year[1]) return relative.name;
    }
    return convertDateStringToFormat(dateString, format, year);
}

export const STATIC_STRINGS = {
    IS_LOADING: "Wird geladen",
    LOADING_ERROR: "Fehler beim Laden"
};

let textMeasureCanvas: HTMLCanvasElement;
// https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
export const measureTextWidth = (text: string, font: string = "normal 16px Arial"): number | null => {
    if (typeof document === "undefined") return null;
    if (!textMeasureCanvas) textMeasureCanvas = document.createElement("canvas");

    const context = textMeasureCanvas.getContext("2d");
    if (context === null) return null;

    context.font = font;
    const metrics = context.measureText(text);
    return metrics.width;
};
