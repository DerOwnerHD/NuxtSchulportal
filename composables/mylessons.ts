import type { Nullable } from "~/server/utils";

export async function useLerngruppenFetch() {
    try {
        const { courses } = await $fetch<{ courses: Lerngruppe[] }>("/api/courses", {
            query: { token: useToken().value, school: useSchool() }
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
                school: useSchool(),
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
        useNotifications().value.set(AppID.MyLessons, -1);
        // @ts-ignore
        useAppErrors().value.set(AppID.MyLessons, error?.data?.error_details ?? error);
    }
}

export interface Lerngruppe {
    id: number;
    semester: string;
    course: string;
    subject: string;
    teacher: {
        name: string;
        image: Nullable<string>;
    };
}

export interface MyLessonsSemester {
    lessons: MyLessonsLesson[];
    attendance: { [key: string]: number };
}

export const useLerngruppen = () => useState<Lerngruppe[]>("lerngruppen");
export const useMyLessonsCourses = () => useState<MyLessonsAllCourses>("mylessons-courses");

export interface MyLessonsAllCourses {
    courses: MyLessonsCourse[];
    expired: MyLessonsCourse[];
}

export interface MyLessonsCourse {
    subject: Nullable<string>;
    teacher: {
        full: Nullable<string>;
        short: Nullable<string>;
    };
    id: number;
    attendance?: { [type: string]: number };
    last_lesson?: MyLessonsLesson;
    // Only available when using /api/mylessons/course
    lessons: MyLessonsLesson[];
}

export interface MyLessonsLesson {
    attendance?: string;
    topic: Nullable<string>;
    date: Nullable<string>;
    entry: number | null;
    lessons?: number[];
    homework: {
        done: boolean;
        description: Nullable<string>;
    } | null;
    downloads: {
        link: Nullable<string>;
        files: {
            extension: Nullable<string>;
            name: Nullable<string>;
            size: Nullable<string>;
        }[];
    };
    uploads: {
        name: Nullable<string>;
        uploadable: boolean;
        link: Nullable<string>;
        files: {
            link: Nullable<string>;
            name: Nullable<string>;
        }[];
    }[];
}

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
    { icon: ["fas", "pen"], identifiers: ["deutsch"] }
];

export function findIconForMyLessonsCourse(name: string) {
    const group = MYLESSONS_ICON_IDENTIFIERS.find((group) => group.identifiers.some((identifier) => name.toLowerCase().includes(identifier)));
    return group?.icon;
}

const useCurrentSemester = () => parseInt(useRuntimeConfig().public.currentSemester as string);
export const useMyLessonsCourseDetails = () => useState("mylessons-course-details", () => new Map<number, MyLessonsCourse>());
export async function fetchMyLessonsCourse(id: number, overwrite: boolean = false) {
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
                school: useSchool(),
                semester: useCurrentSemester(),
                id,
                key
            }
        });
        const { error, ...data } = response;
        // @ts-ignore
        courses.value.set(id, data);
        return data;
    } catch (error) {
        useReauthenticate(error);
        // @ts-ignore
        useAppErrors().value.set(AppID.MyLessonsCourse, error?.data?.error_details ?? error);
        return null;
    }
}

export function useMyLessonsFlyout() {
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
}
