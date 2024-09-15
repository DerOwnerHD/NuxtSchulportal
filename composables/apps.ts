interface AppRegistry {
    icon: string;
    name: string;
    load_function: () => Promise<any> | any;
    load_on_mount?: boolean;
    route: string;
    /**
     * Whether the item should be visible in the dock when it is only the small version (not fullscreen)
     */
    compact_mode?: boolean;
    id: AppID;
    flyout?: ComputedRef<FlyoutGroups>;
    hide_notifications?: boolean;
}

interface BackgroundGradientConfig {
    pattern?: RegExp;
    color: number;
    type: "page" | "default" | "error";
}
export const useBackgroundColorMultiplier = () => 0.5;
export const useBackgroundGradients = (): BackgroundGradientConfig[] => [
    { pattern: /^\/vertretungsplan(\/)?$/, color: 0x1fbd54, type: "page" },
    { pattern: /^\/stundenplan(\/)?$/, color: 0x0000ad, type: "page" },
    { pattern: /^\/mylessons(\/.*)?$/, color: 0x665ef3, type: "page" },
    { color: 0x670310, type: "error" },
    { color: 0x254e63, type: "default" }
];

export const useApps = () =>
    computed<AppRegistry[]>(() => [
        {
            icon: "/icons/vplan.svg",
            name: "Vertretungsplan",
            flyout: useVertretungsplanFlyout(),
            id: AppID.Vertretungsplan,
            load_function: fetchVertretungsplan,
            load_on_mount: true,
            route: "/vertretungsplan",
            compact_mode: true
        },
        {
            icon: "/icons/splan.svg",
            name: "Stundenplan",
            flyout: useStundenplanFlyout(),
            id: AppID.Stundenplan,
            load_function: fetchStundenplan,
            load_on_mount: true,
            route: "/stundenplan",
            compact_mode: true
        },
        {
            icon: "/icons/moodle.svg",
            name: "Moodle",
            flyout: computed(() => []),
            id: AppID.Moodle,
            load_function: () => {},
            load_on_mount: false,
            route: "/moodle",
            compact_mode: true
        },
        {
            icon: "/icons/mylessons.svg",
            name: "Mein Unterricht",
            flyout: useMyLessonsFlyout(),
            id: AppID.MyLessons,
            load_function: fetchMyLessonsCourses,
            load_on_mount: true,
            route: "/mylessons",
            compact_mode: true
        },
        {
            icon: "/icons/traffic-light-vertical.svg",
            name: "Status",
            flyout: computed(() => []),
            id: AppID.Status,
            load_function: () => {},
            load_on_mount: false,
            route: "/status",
            compact_mode: false,
            hide_notifications: true
        }
    ]);

export enum AppID {
    Vertretungsplan = "vertretungsplan",
    MyLessons = "mylessons",
    /**
     * This is used for app errors when the page of a specific course is viewed
     */
    MyLessonsCourse = "mylessons-course",
    Stundenplan = "stundenplan",
    AES = "aes",
    Moodle = "moodle",
    Status = "status"
}
