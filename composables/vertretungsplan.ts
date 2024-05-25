import type { Nullable } from "~/server/utils";

export const useVertretungsplanFlyout = () => {
    const vertretungsplan = useVertretungsplan();
    const distance = vertretungsplan.value?.last_updated
        ? `Vor ${calculateDateDistance(new Date(vertretungsplan.value.last_updated).getTime())} aktualisiert`
        : isLoadingPlan.value
          ? STATIC_STRINGS.IS_LOADING
          : STATIC_STRINGS.LOADING_ERROR;
    return [
        [{ title: "Vertretungsplan", text: distance, action: () => navigateTo("/vertretungsplan") }],
        [
            { title: "Neu laden", icon: ["fas", "arrow-rotate-right"], action: () => fetchVertretungsplan(), disabled: isLoadingPlan.value },
            {
                title: "Neu laden",
                text: "Mit erneutem Login",
                icon: ["fas", "arrow-rotate-right"],
                action: () => fetchVertretungsplan(true),
                disabled: isLoadingPlan.value
            }
        ]
    ];
};

export const useVertretungsplan = () => useState<Vertretungsplan>("vertretungsplan");

const isLoadingPlan = ref(false);
export const fetchVertretungsplan = async (reauth?: boolean) => {
    if (isLoadingPlan.value) return;
    isLoadingPlan.value = true;
    useAppErrors().value.delete("vertretungsplan");
    useNotifications().value.delete("vertretungsplan");
    // @ts-ignore
    useVertretungsplan().value = null;
    try {
        // A event handler may pass an event as first parameter
        if (reauth === true) await useAuthenticate();
        const data = await $fetch("/api/vertretungen", {
            query: {
                school: useSchool(),
                token: useToken().value
            },
            retry: false
        });
        const vertretungsCount = data.days.reduce((amount, day) => (amount += day.vertretungen.length), 0);
        useNotifications().value.set("vertretungsplan", vertretungsCount);
        // @ts-ignore
        delete data.error;
        useVertretungsplan().value = data;
    } catch (error) {
        useReauthenticate(error);
        useNotifications().value.set("vertretungsplan", -1);
        // @ts-ignore
        useAppErrors().value.set("vertretungsplan", error?.data ?? error);
    }
    isLoadingPlan.value = false;
};

interface VertretungsDay {
    date: string;
    day: string;
    day_of_week: string;
    relative: string;
    vertretungen: Vertretung[];
    news: string[];
}

interface Vertretungsplan {
    days: VertretungsDay[];
    last_updated: Nullable<string>;
    updating: boolean;
}

interface Vertretung {
    lessons: {
        list: number[];
        from: number;
        to: number;
    };
    class: Nullable<string>;
    substitute: Nullable<string>;
    teacher: Nullable<string>;
    subject: Nullable<string>;
    subject_old: Nullable<string>;
    room: Nullable<string>;
    note: Nullable<string>;
}
