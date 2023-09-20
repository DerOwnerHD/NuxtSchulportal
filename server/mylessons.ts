export interface MyLessonsCourse {
    subject: string | null;
    teacher: {
        full: string | null;
        short: string | null;
    };
    id: number;
    attendance?: number;
}
