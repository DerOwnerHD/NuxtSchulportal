export async function fetchOberstufenWahl() {
    const token = useToken();
    if (!token.value) return console.error("Cannot fetch Oberstufenwahl w/o token");
    try {
        const { elections } = await $fetch<{ error: boolean; elections: Oberstufenwahl[] }>("/api/oberstufenwahl", {
            query: { token: token.value, school: useSchool() }
        });

        if (!Array.isArray(elections)) return;

        useOberstufenWahlen().value = elections;
        checkForAlertElections();
    } catch (error) {
        console.error("Oberstufenwahl fetch", error);
    }
}

export const useOberstufenWahlen = () => useState<Oberstufenwahl[]>("oberstufenwahlen", () => []);

function checkForAlertElections() {
    const metadata: OberstufenwahlMetadata[] = [];
    const ONE_DAY = 1000 * 60 * 60 * 24;
    const now = new Date().getTime();
    for (const election of useOberstufenWahlen().value) {
        // @ts-ignore
        const [start, end] = ["start", "end"].map((x) => new Date(election[x]));
        const hasEnded = end.getTime() <= now;
        // That would most likely mean that the user has not submitted anything in time
        if (hasEnded) continue;
        const hasStarted = start.getTime() <= now;
        const distance = calculateDateDistance(hasStarted ? end.getTime() : start.getTime(), true);
        metadata.push({ ...election, hasStarted, distance });
    }
    // Did any events already start or will they within the next 24 hours
    // If they might only start in a few days, there is no need to ring the alert
    const anyHaveStartedOrWillSoon = metadata.some((x) => x.hasStarted || new Date(x.start).getTime() - now <= ONE_DAY);
    // We found nothing. No need to show that damn box
    if (!metadata.length) return;
    useState("oberstufenwahlen-meta").value = metadata;
    // As long as the cookie persists, do not attempt to look at those things
    if (useCookie("oberstufenwahl-reminder").value || !anyHaveStartedOrWillSoon) return;
    useCookie("oberstufenwahl-reminder", {
        expires: new Date(Date.now() + ONE_DAY),
        httpOnly: false
    }).value = "1";
    modifyOpenDialogBoxes("oberstufenwahl");
}

export function calculateDateDistance(timestamp: number, dativ?: boolean) {
    const steps = [1000, 60, 60, 24];
    // It shouldn't matter whether it's in the future or past
    const difference = Math.abs(Date.now() - timestamp);
    let iterator = 0;
    for (const step of ["Sekunde", "Minute", "Stunde"]) {
        // This multiplies all steps before and including this current one
        // -> Refers to second, minute and hour
        const multiplier = steps.slice(0, iterator + 1).reduce((acc, value) => acc * value, 1);
        if (difference < multiplier * steps[iterator + 1]) {
            const number = Math.floor(difference / multiplier);
            return `${number} ${step}${number !== 1 ? "n" : ""}`;
        }
        iterator++;
    }
    // This is just a fallback if the thing has not been reloaded within the
    // last 24 hours (like on weekends) -> there shouldn't be 100 hours on the counter
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    // OH WOW SO IMPORTANT
    const dayEnding = dativ ? "en" : "e";
    return `${days} Tag${days !== 1 ? dayEnding : ""}`;
}

export interface OberstufenwahlMetadata extends Oberstufenwahl {
    hasStarted: boolean;
    distance: string;
}

export interface Oberstufenwahl {
    title: string | null;
    start: string;
    end: string;
    id: number | null;
}
