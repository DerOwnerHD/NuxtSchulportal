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
    date: string | null;
    index: number | null;
    homework: {
        done: boolean;
        description: string | null;
    } | null;
}
