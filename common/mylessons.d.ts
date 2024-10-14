import { Nullable } from ".";

export interface MyLessonsAllCourses {
    courses: MyLessonsCourseGlobal[];
    expired: MyLessonsCourseGlobal[];
}

export interface MyLessonsCourse {
    subject: Nullable<string>;
    teacher: {
        full: Nullable<string>;
        short: Nullable<string>;
    };
    id: number;
    attendance: Record<string, number>;
    /**
     * Only available when using /api/mylessons/course
     */
    lessons: MyLessonsLesson[];
}

/**
 * Does not contain the lessons field.
 * That field is only available when getting individual courses.
 */
export interface MyLessonsCourseGlobal {
    subject: Nullable<string>;
    teacher: {
        full: Nullable<string>;
        short: Nullable<string>;
    };
    id: number;
    last_lesson: MyLessonsLessonGlobal;
}

export interface MyLessonsLesson {
    attendance?: string;
    topic: Nullable<string>;
    description: Nullable<string>;
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

/**
 * Used when getting the latest lesson of courses on the courses overview
 */
export interface MyLessonsLessonGlobal extends MyLessonsLesson {
    downloads: null;
    uploads: null;
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
    attendance: Record<string, number>;
}
