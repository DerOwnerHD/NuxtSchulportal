export interface VertretungsDay {
    date: number;
    day: string;
    day_of_week: string;
    relative: string;
    vertretungen: Vertretung[];
    news: string[];
}

export interface Vertretungsplan {
    days: VertretungsDay[];
    last_updated: number | null;
    updating: boolean;
}

export interface Vertretung {
    lessons: {
        list: number[];
        from: number;
        to: number;
    };
    class: Nullable<string>;
    substitute: Nullable<string>;
    teacher: Nullable<string>;
    subject: Nullable<string>;
    subject_old: Nullable<string>;
    room: Nullable<string>;
    note: Nullable<string>;
}
