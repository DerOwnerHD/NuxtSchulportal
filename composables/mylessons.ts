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

export async function useMyLessonsCoursesFetch() {
    const key = (await useAESKey()) ?? undefined;
    const token = useToken();
    const session = useSession();

    const { data, error } = await useFetch<MyLessonsResponse>("/api/mylessons/courses", {
        query: {
            school: useSchool(),
            token: token.value,
            session: session.value,
            key
        },
        retryStatusCodes: [429],
        retryDelay: 15000
    });

    if (error.value !== null) {
        const { cause, data } = error.value;
        return (useAppErrors().value.mylessons = data?.error_details ?? cause);
    }

    if (data.value === null) throw new ReferenceError("Error and data both not given");

    delete data.value.error;
    useMyLessonsCourses().value = data.value;
    useAppNews().value.lessons = data.value.courses.filter((course) => course.last_lesson?.homework && !course.last_lesson.homework.done).length;
}

export interface Lerngruppe {
    id: number;
    semester: string;
    course: string;
    subject: string;
    teacher: {
        name: string;
        image: NullableString;
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

interface MyLessonsResponse extends MyLessonsAllCourses {
    error?: boolean;
}

export interface MyLessonsCourse {
    subject: NullableString;
    teacher: {
        full: NullableString;
        short: NullableString;
    };
    id: number;
    attendance?: { [type: string]: number };
    last_lesson?: MyLessonsLesson;
}

export interface MyLessonsLesson {
    topic: NullableString;
    date: NullableString;
    entry: number | null;
    lessons?: number[];
    homework: {
        done: boolean;
        description: NullableString;
    } | null;
    downloads: {
        link: NullableString;
        files: {
            extension: NullableString;
            name: NullableString;
            size: NullableString;
        }[];
    };
    uploads: {
        name: NullableString;
        uploadable: boolean;
        link: NullableString;
        files: {
            link: NullableString;
            name: NullableString;
        }[];
    }[];
}

type NullableString = string | null;

export const useSelectedMyLessonsCourse = () => useState<MyLessonsCourse>("selected-mylessons-course");
