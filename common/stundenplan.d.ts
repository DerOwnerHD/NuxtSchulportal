export interface Stundenplan {
    days: StundenplanDay[];
    start_date: string;
    end_date: string | null;
    lessons: number[][][];
    current: boolean;
}

export interface StundenplanLesson {
    lessons: number[];
    classes: StundenplanClass[];
}

export interface StundenplanClass {
    teacher: string;
    room: string;
    name: string;
}

export interface StundenplanDay {
    name: "Montag" | "Dienstag" | "Mittwoch" | "Donnerstag" | "Freitag";
    lessons: StundenplanLesson[];
}
