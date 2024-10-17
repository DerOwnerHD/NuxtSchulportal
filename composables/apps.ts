import type { AnyFunction } from "~/common";

interface AppRegistry {
    icon: string;
    name: string;
    load_function: AnyFunction;
    load_on_mount?: boolean;
    route: string;
    /**
     * Whether the item should be visible in the dock when it is only the small version (not fullscreen)
     */
    compact_mode?: boolean;
    id: AppID;
    flyout?: ComputedRef<FlyoutGroup[]>;
    hide_notifications?: boolean;
}

interface BackgroundGradientConfig {
    pattern?: RegExp;
    color: number;
    type: "page" | "default" | "error";
}
export function useBackgroundColorMultiplier() {
    return 0.5;
}
export function useBackgroundGradients(): BackgroundGradientConfig[] {
    return [
        { pattern: /^\/vertretungsplan(\/)?$/, color: 0x1fbd54, type: "page" },
        { pattern: /^\/stundenplan(\/)?$/, color: 0x0000ad, type: "page" },
        { pattern: /^\/mylessons(\/.*)?$/, color: 0x665ef3, type: "page" },
        { pattern: /^\/moodle(\/.*)?$/, color: 0xfd8b00, type: "page" },
        { color: 0x670310, type: "error" },
        { color: 0x254e63, type: "default" }
    ];
}
export function useNonScrollablePages() {
    return [/^\/mylessons\/\d+$/, /^\/vertretungsplan\/?$/];
}

/**
 * All apps are registered in this list. Determines dock placement and auto-run at mount.
 */
export const appRegistry = computed<AppRegistry[]>(() => [
    {
        icon: "/icons/vplan.svg",
        name: "Vertretungsplan",
        flyout: vertretungsplanFlyout,
        id: AppID.Vertretungsplan,
        load_function: fetchVertretungsplan,
        load_on_mount: true,
        route: "/vertretungsplan",
        compact_mode: true
    },
    {
        icon: "/icons/splan.svg",
        name: "Stundenplan",
        flyout: stundenplanFlyout,
        id: AppID.Stundenplan,
        load_function: fetchStundenplan,
        load_on_mount: true,
        route: "/stundenplan",
        compact_mode: true
    },
    {
        icon: "/icons/moodle.svg",
        name: "Moodle",
        flyout: moodleFlyout,
        id: AppID.Moodle,
        load_function: attemptMoodleLogin,
        load_on_mount: true,
        route: "/moodle",
        compact_mode: true
    },
    {
        icon: "/icons/mylessons.svg",
        name: "Mein Unterricht",
        flyout: myLessonsFlyout,
        id: AppID.MyLessons,
        load_function: fetchMyLessonsCourses,
        load_on_mount: true,
        route: "/mylessons",
        compact_mode: true
    },
    /**
     * TODO: Design own icons for these. As "placeholders" (still very cool) FluentUI emojis icons from Microsoft are used
     */
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
    },
    {
        icon: "/icons/megaphone.svg",
        name: "Pushs",
        flyout: computed(() => []),
        id: AppID.Notifications,
        load_function: () => {},
        load_on_mount: false,
        route: "/notifications",
        compact_mode: false,
        hide_notifications: true
    },
    {
        icon: "/icons/waving-hand.svg",
        name: "Abmelden",
        flyout: computed(() => []),
        id: AppID.Logoff,
        load_function: () => {},
        load_on_mount: false,
        route: "/logoff",
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
    Status = "status",
    Notifications = "notifications",
    Logoff = "logoff",
    MoodleCourseList = "moodle-course-list"
}
