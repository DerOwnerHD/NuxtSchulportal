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
            "mylessons",
            response.courses.filter((course) => course.last_lesson?.homework && !course.last_lesson.homework.done).length
        );
    } catch (error) {
        useNotifications().value.set("mylessons", -1);
        // @ts-ignore
        useAppErrors().value.set("mylessons", error?.data ?? error);
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
}

export interface MyLessonsLesson {
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
    { icon: ["fas", "language"], identifiers: ["engl", "spanisch", "franz"] },
    { icon: ["fas", "masks-theater"], identifiers: ["ds", "theater", "darstellendes spiel"] }
];

export function findIconForMyLessonsCourse(name: string) {
    const group = MYLESSONS_ICON_IDENTIFIERS.find((group) => group.identifiers.some((identifier) => name.toLowerCase().includes(identifier)));
    return group?.icon;
}
