import type { MyLessonsAllCourses, MyLessonsCourse, Lerngruppe, MyLessonsCourseGlobal } from "~/common/mylessons";
import { setNotificationCount } from "./notifications";

export async function useLerngruppenFetch() {
    try {
        const { courses } = await $fetch<{ courses: Lerngruppe[] }>("/api/courses", {
            query: { token: useToken().value, school: school.value }
        });
        useLerngruppen().value = courses;
    } catch (error) {
        console.error(error);
    }
}

export async function fetchMyLessonsCourses() {
    const key = (await useAESKey()) ?? undefined;
    const token = useToken();
    const session = useSession();
    useAppErrors().value.delete(AppID.MyLessons);
    try {
        const response = await $fetch("/api/mylessons/courses", {
            query: {
                school: school.value,
                token: token.value,
                session: session.value,
                key
            }
        });
        // @ts-ignore
        useMyLessonsCourses().value = { courses: response.courses, expired: response.expired };
        useNotifications().value.set(
            AppID.MyLessons,
            response.courses.filter((course) => course.last_lesson?.homework && !course.last_lesson.homework.done).length
        );
    } catch (error) {
        useReauthenticate(error);
        setNotificationCount(AppID.MyLessons, -1);
        createAppError(AppID.MyLessons, error, fetchMyLessonsCourses);
    }
}

export const useLerngruppen = () => useState<Lerngruppe[]>("lerngruppen");
export const useMyLessonsCourses = () => useState<MyLessonsAllCourses>("mylessons-courses");

export const useSelectedMyLessonsCourse = () => useState<MyLessonsCourse>("selected-mylessons-course");

export const MYLESSONS_ICON_IDENTIFIERS = [
    { icon: ["fas", "landmark"], identifiers: ["politik", "wirtschaft", "powi"] },
    { icon: ["fas", "magnet"], identifiers: ["phy"] },
    { icon: ["fas", "keyboard"], identifiers: ["info"] },
    { icon: ["fas", "square-root-variable"], identifiers: ["mathe"] },
    { icon: ["fas", "flask-vial"], identifiers: ["che"] },
    { icon: ["fas", "hands-praying"], identifiers: ["reli"] },
    { icon: ["fas", "earth-americas"], identifiers: ["geo", "erd"] },
    { icon: ["fas", "language"], identifiers: ["engl", "spanisch", "franz", "latein", "griech", "russisch"] },
    { icon: ["fas", "masks-theater"], identifiers: ["ds", "theater", "darstellendes spiel"] },
    { icon: ["fas", "running"], identifiers: ["sport"] },
    { icon: ["fas", "pen"], identifiers: ["deutsch"] },
    { icon: ["fas", "monument"], identifiers: ["geschi"] }
];

export function findIconForMyLessonsCourse(name: string) {
    const group = MYLESSONS_ICON_IDENTIFIERS.find((group) => group.identifiers.some((identifier) => name.toLowerCase().includes(identifier)));
    return group?.icon;
}

export const useCurrentSemester = () => parseInt(useRuntimeConfig().public.currentSemester as string);
export const useMyLessonsCourseDetails = () => useState("mylessons-course-details", () => new Map<number, MyLessonsCourse>());

export async function fetchMyLessonsCourse(id: number, semester?: number, overwrite: boolean = false) {
    const courses = useMyLessonsCourseDetails();
    const session = useSession();
    const token = useToken();
    const key = (await useAESKey()) ?? undefined;
    if (overwrite) courses.value.delete(id);
    if (courses.value.has(id) && !overwrite) return courses.value.get(id);
    try {
        const response = await $fetch("/api/mylessons/course", {
            query: {
                session: session.value,
                token: token.value,
                school: school.value,
                semester: semester ?? useCurrentSemester(),
                id,
                key
            }
        });
        const { error, error_details, ...data } = response;
        void courses.value.set(id, data);
    } catch (error) {
        useReauthenticate(error);
        createAppError(AppID.MyLessonsCourse, error, () => fetchMyLessonsCourse(id, semester, overwrite));
    }
}

export const useMyLessonsFlyout = computed<FlyoutGroups>(() => {
    const courses = useMyLessonsCourses();
    if (!courses.value) return [];
    return [
        courses.value.courses.map((course) => {
            return {
                title: course.subject ?? "",
                icon: findIconForMyLessonsCourse(course.subject ?? ""),
                action: () => navigateTo(`/mylessons/${course.id}`)
            };
        })
    ];
});
