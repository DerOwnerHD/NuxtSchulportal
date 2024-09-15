import type { CalendarEntry, CalendarFilters } from "~/common/calendar";

export const useCalendarEntries = () => useState<CalendarEntry[]>("calendar-entries");
/**
 * Calendar categories are dynamically added to /kalender.php by javascript.
 * IF they are school-dependent, they might not be accurate in this listing
 */
export const calendarCategories = [
    // This is a category (most likely created by accident) that contains the week entries
    // and does have neither name nor icon on SPH (undefined). This is most likely a bug.
    // It is also the only one to return an actual number in the SPH calendar API instead
    // of a string, this is all sooooo weird...
    { id: 0, name: null, hidden: true },
    // Some of these names, like "Schulinterne Fortbildung", have been changed
    { id: 1, name: "Klausuren", colors: ["#00ffff", "#37a3e9"], icon: ["fas", "book"] },
    { id: 2, name: "Fortbildung", colors: ["#74ff5c", "#89cc34"], icon: ["fas", "pen-to-square"] },
    { id: 3, name: "Besprechung", colors: ["#1e00ff", "#812efe"], icon: ["fas", "bell"] },
    { id: 4, name: "Veranstaltung", colors: ["#043adc", "#8a21ec"], icon: ["fas", "expand"] },
    { id: 5, name: "Ferien", colors: ["#00ffff", "#37a3e9"], icon: ["fas", "thumbs-up"] },
    { id: 6, name: "Konferenz", colors: ["#dc30e8", "#ac5df5"], icon: ["fas", "clipboard-list"] },
    { id: 7, name: "Wartung", colors: ["#ff0000", "#ff5e39"], icon: ["fas", "server"] },
    { id: 8, name: "Fachkonferenz", colors: ["#5e4ce6", "#8e5bf4"], icon: ["fas", "at"] },
    { id: 9, name: "Fortbildung (extern)", colors: ["#97f575", "#42e86e"], icon: ["fas", "chalkboard-user"] },
    { id: 10, name: "Abitur", colors: ["#d70fd0", "#f55d90"], icon: ["fas", "graduation-cap"] },
    { id: 11, name: "Externe Termine", colors: ["#000000", "#000000"], icon: ["fas", "car"] },
    { id: 12, name: "Elterngespräche", colors: ["#fff994", "#ffdf08"], icon: ["fas", "calendar"] },
    { id: 13, name: "Examen", colors: ["#97f575", "#9ef247"], icon: ["fas", "highlighter"] },
    { id: 14, name: "Berufliche Orientierung", colors: ["#ff6250", "#ff7f50"], icon: ["fas", "briefcase"] },
    { id: 15, name: "Notentermine", colors: ["#ed1700", "#ed8f00"], icon: ["fas", "bell"] }
];

export const fetchCalendar = async (filters: CalendarFilters) =>
    await useFetch("/api/calendar", {
        query: { ...filters, school: useSchool() },
        headers: { Authorization: useToken().value }
    });
