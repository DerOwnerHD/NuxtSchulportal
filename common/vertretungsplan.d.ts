import { Nullable } from ".";

export interface VertretungsDay {
    date: string;
    day: string;
    day_of_week: string;
    relative: string;
    vertretungen: Vertretung[];
    news: string[];
}

export interface Vertretungsplan {
    days: VertretungsDay[];
    last_updated: string | null;
    updating: boolean;
}

export interface Vertretung {
    lessons: {
        list: number[];
        from: number;
        to: number;
    };
    classes: Nullable<string>;
    substitute: Nullable<string>;
    teacher: Nullable<string>;
    subject: Nullable<string>;
    subject_old: Nullable<string>;
    room: Nullable<string>;
    note: Nullable<string>;
    type: Nullable<string>;
}
