import type { MoodleCourse, MoodleCoursesListClassification } from "~/common/moodle";

interface MoodleCredentials {
    cookie: string;
    session: string;
    paula: string;
    user: number;
}
export const useMoodleCredentials = () => useCookie<MoodleCredentials>("moodle-credentials");

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

export const useMoodleCourses = () => useState("moodle-courses", () => new Map<MoodleCoursesListClassification, MoodleCourse[]>());
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
    clearAppError(AppID.MoodleCourseList);
    if (list.value.has(type) && !overwrite) return;
    // @ts-ignore clearing
    list.value.delete(type);
    const creds = useMoodleCredentials();
    if (!creds.value) {
        createAppError(AppID.MoodleCourseList, "Nicht angemeldet", () => fetchMoodleCourses(type, overwrite));
        return;
    }
    try {
        const { session, cookie } = creds.value;
        const response = await $fetch("/api/moodle/courses", {
            params: { session, cookie, school: school.value, classification: type }
        });
        list.value.set(type, response.courses);
    } catch (error) {
        createAppError(AppID.MoodleCourseList, error, () => fetchMoodleCourses(type, overwrite));
        await useReauthenticate(error, "moodle");
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
