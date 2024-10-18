import type { MoodleCourse, MoodleCoursesListClassification, MoodleNotification } from "~/common/moodle";
import type { AnyFunction } from "~/common";
import type { BasicResponse } from "~/server/utils";

interface MoodleCredentials {
    cookie: string;
    session: string;
    paula: string;
    user: number;
}
export const useMoodleCredentials = () => useCookie<MoodleCredentials>("moodle-credentials");
export const useMoodleCourses = () => useState("moodle-courses", () => new Map<MoodleCoursesListClassification, MoodleCourse[]>());
export const useMoodleNotifications = () => useState<MoodleNotification[]>("moodle-notifications");

export async function attemptMoodleLogin(bypassCheck?: boolean) {
    const session = useSession();
    const nuxt = useNuxtApp();
    // TODO: there is no SPH re-auth if the SPH-Session cookie has expired
    if (!session.value || school.value === null) return;

    clearAppError(AppID.Moodle);

    const isStillValid = !bypassCheck ? await checkMoodleAuth() : false;
    if (isStillValid) {
        console.log("Requested moodle re-auth while session is still valid");
        setNotificationCount(AppID.Moodle, 0);
        void fetchMoodleCourses("all");
        return;
    }

    try {
        const response = await $fetch("/api/moodle/login", {
            method: "POST",
            body: { session: session.value, school: school.value }
        });
        // If the API encounters any error, the response code will never be 200, thus this will never be run
        nuxt.runWithContext(() => {
            const creds = useMoodleCredentials();
            const { error, error_details, ...data } = response;
            creds.value = data;
            setNotificationCount(AppID.Moodle, 0);
            void fetchMoodleCourses("all");
        });
    } catch (error) {
        createAppError(AppID.Moodle, error, attemptMoodleLogin, false);
        console.error("Failed to fetch Moodle login", error);
    }
}

export async function checkMoodleAuth(): Promise<boolean> {
    const moodleCreds = useMoodleCredentials();
    if (!moodleCreds.value || school.value === null) return false;
    try {
        const { session, cookie } = moodleCreds.value;
        const response = await $fetch("/api/moodle/check", {
            params: { session, cookie, school: school.value }
        });
        return response.valid;
    } catch (error) {
        console.error("Failed to fetch Moodle auth status", error);
        return false;
    }
}

export function invalidateMoodleCourseList(type?: MoodleCoursesListClassification) {
    const map = useMoodleCourses();
    if (!type) {
        map.value = new Map();
        return;
    }
    map.value.delete(type);
}
export async function fetchMoodleCourses(type: MoodleCoursesListClassification = "all", overwrite?: boolean) {
    const list = useMoodleCourses();
    if (list.value.has(type) && !overwrite) return;
    clearAppError(AppID.MoodleCourseList);
    // Causes the UI to show loading progress IF the data was already previously loaded
    list.value.delete(type);
    const data = await performMoodleRequest<{ courses: MoodleCourse[] }>(
        AppID.MoodleCourseList,
        "/api/moodle/courses",
        () => fetchMoodleCourses(...arguments),
        { classification: type }
    );
    if (data === null) return;
    list.value.set(type, data.courses);
}

export async function fetchMoodleNotifications(overwrite?: boolean) {
    const list = useMoodleNotifications();
    if (Array.isArray(list.value) && !overwrite) return;
    clearAppError(AppID.MoodleNotifications);
    // @ts-ignore
    list.value = null;
    const data = await performMoodleRequest<{ notifications: MoodleNotification[] }>(AppID.MoodleNotifications, "/api/moodle/notifications", () =>
        fetchMoodleNotifications(...arguments)
    );
    if (data === null) return;
    list.value = data.notifications;
}

type HTTPMethod = "get" | "post" | "patch" | "delete";
export async function performMoodleRequest<T = BasicResponse>(
    id: AppID,
    path: string,
    retryFunction?: AnyFunction,
    params?: Record<string, any>,
    body?: Record<string, any>,
    method: HTTPMethod = "get"
): Promise<T | null> {
    const creds = useMoodleCredentials();
    if (!creds.value) {
        createAppError(id, "Nicht angemeldet", retryFunction);
        return null;
    }
    try {
        const { session, cookie } = creds.value;
        return await $fetch<T>(path, { params: { session, cookie, school: school.value, ...params }, body, method });
    } catch (error) {
        createAppError(id, error, retryFunction);
        await useReauthenticate(error, "moodle");
        return null;
    }
}

/**
 * Attempts to wrap an image link inside a proxy API call.
 *
 * This is only necessary when dealing with images fetched directly from Moodle.
 * These require authentication that is provided in the GET params as the cookie.
 *
 * This function does not directly fetch the image data, rather only return a link
 * to the /api/moodle/proxy API if required. Anything that does not fall under
 * Moodle auth will be returned as is.
 * @param link The URL to either return as is or wrap as a proxy
 */
export function proxyMoodleImage(link: string) {
    try {
        const credentials = useMoodleCredentials();
        if (!credentials.value || school.value === null) return link;
        const url = new URL(link);
        const baseURL = new URL(window.location.href);
        if (!/^mo\d{1,5}\.schulportal\.hessen\.de$/.test(url.hostname)) return link;
        return `${baseURL.origin}/api/moodle/proxy?cookie=${credentials.value.cookie}&school=${school.value}&path=${encodeURIComponent(url.pathname)}`;
    } catch {
        return link;
    }
}

export const moodleFlyout = computed<FlyoutGroup[]>(() => {
    const creds = useMoodleCredentials();
    const courses = useMoodleCourses();
    const hasError = hasAppError(AppID.Moodle);

    const overviewGroup: FlyoutGroup = {
        items: [
            {
                title: "Dein Moodle",
                text: hasError ? STATIC_STRINGS.LOADING_ERROR : !creds.value ? STATIC_STRINGS.IS_LOADING : ""
            }
        ]
    };

    const allCourses = courses.value.get("all");
    // TODO: rewire link when course pages are set up
    const courseList = allCourses?.map((course) => ({ title: course.names.short, action: () => navigateTo(`/moodle`) })) ?? [];
    const coursesFlyout: FlyoutGroup[] = [{ items: courseList }];

    // Contains expands to all different categories of "things" on Moodle
    const detailsGroup: FlyoutGroup = {
        items: [
            {
                title: "Deine Kurse",
                text: hasAppError(AppID.MoodleCourseList)
                    ? STATIC_STRINGS.LOADING_ERROR
                    : allCourses
                      ? `${allCourses.length} Kurs${allCourses.length !== 1 ? "e" : ""}`
                      : STATIC_STRINGS.IS_LOADING,
                type: "expand",
                chained_flyout: coursesFlyout
            }
        ]
    };

    return [overviewGroup, detailsGroup];
});
