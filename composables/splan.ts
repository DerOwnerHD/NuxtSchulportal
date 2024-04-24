export interface StundenplanLesson {
    lessons: number[];
    classes: StudenplanClass[];
}

interface StudenplanClass {
    teacher: string;
    room: string;
    name: string;
}

export interface Stundenplan {
    days: StundenplanDay[];
    start_date: string;
    end_date: string | null;
    lessons: number[][][];
    current: boolean;
}

interface StundenplanDay {
    name: "Montag" | "Dienstag" | "Mittwoch" | "Donnerstag" | "Freitag";
    lessons: StundenplanLesson[];
}

export const useStundenplan = () => useState<Stundenplan[]>("splan", () => []);
export async function useStundenplanFetch() {
    const { plans } = await $fetch<{ plans: Stundenplan[] }>("/api/stundenplan", {
        query: { token: useToken().value, school: useSchool() }
    }).catch((error) => (useAppErrors().value.splan = error?.data?.error_details ?? error));

    if (!Array.isArray(plans)) return;
    useStundenplan().value = plans;
    useAppNews().value.splan = plans.length - 1;
}
