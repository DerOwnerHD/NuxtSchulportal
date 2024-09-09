export interface MyLessonsCourse {
    subject: string | null;
    teacher: {
        full: string | null;
        short: string | null;
    };
    id: number;
    attendance?: { [type: string]: number };
    last_lesson?: MyLessonsLesson;
}

export interface MyLessonsLesson {
    topic: string | null;
    description: string | null;
    date: string | null;
    entry: number | null;
    homework: {
        done: boolean;
        description: string | null;
    } | null;
    downloads: {
        link: NullableString;
        files: {
            extension: NullableString;
            name: NullableString;
            size: NullableString;
        }[];
    } | null;
    uploads: {
        name: NullableString;
        uploadable: boolean;
        link: NullableString;
        files: {
            link: NullableString;
            name: NullableString;
        }[];
    } | null;
}

type NullableString = string | null;

export const COURSE_UNAVAILABLE_ERROR = "Dieses Heft kann für diesen Account nicht geöffnet werden!";
