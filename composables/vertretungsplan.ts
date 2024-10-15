import type { Vertretungsplan } from "~/common/vertretungsplan";

export const vertretungsplanFlyout = computed<FlyoutGroup[]>(() => {
    const vertretungsplan = useVertretungsplan();
    const distance = vertretungsplan.value?.last_updated
        ? `Vor ${calculateDateDistance(new Date(vertretungsplan.value.last_updated).getTime(), true)} aktualisiert`
        : isLoadingPlan.value
          ? STATIC_STRINGS.IS_LOADING
          : STATIC_STRINGS.LOADING_ERROR;

    const overviewGroup: FlyoutGroup = {
        items: [{ title: "Vertretungsplan", text: distance, action: () => navigateTo("/vertretungsplan") }]
    };
    const reloadGroup: FlyoutGroup = {
        items: [
            {
                title: "Neu laden",
                icon: ["fas", "arrow-rotate-right"],
                action: () => fetchVertretungsplan(),
                disabled: isLoadingPlan.value
            },
            {
                title: "Neu laden",
                text: "Mit erneutem Login",
                icon: ["fas", "arrow-rotate-right"],
                action: () => fetchVertretungsplan(true),
                disabled: isLoadingPlan.value
            }
        ]
    };
    return [overviewGroup, reloadGroup];
});

export const useVertretungsplan = () => useState<Vertretungsplan>("vertretungsplan");

const isLoadingPlan = ref(false);
export async function fetchVertretungsplan(reauth?: boolean) {
    if (isLoadingPlan.value) return;
    isLoadingPlan.value = true;
    const plan = useVertretungsplan();
    clearAppError(AppID.Vertretungsplan);
    clearNotifications(AppID.Vertretungsplan);
    // @ts-ignore
    plan.value = null;
    try {
        // An event handler may pass an event as first parameter to force a re-auth
        if (reauth === true) await useAuthenticate();
        const data = await $fetch("/api/vertretungen", {
            query: {
                school: school.value,
                token: useToken().value
            }
        });
        const vertretungsCount = data.days.reduce((amount, day) => amount + day.vertretungen.length, 0);
        setNotificationCount(AppID.Vertretungsplan, vertretungsCount);
        plan.value = data;
    } catch (error) {
        createAppError(AppID.Vertretungsplan, error, fetchVertretungsplan);
        await useReauthenticate(error);
    }
    isLoadingPlan.value = false;
}
