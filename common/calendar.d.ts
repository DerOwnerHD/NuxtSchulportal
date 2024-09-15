interface CalendarFilters {
    category?: number;
    query?: string;
    start: string;
    end?: string;
    new?: boolean;
}
export interface CalendarEntry {
    school: number;
    id: number;
    start: string;
    end: string;
    last_updated: string;
    author: string | null;
    location: string | null;
    public: boolean;
    private: boolean;
    secret: boolean;
    new: boolean;
    title: string;
    category: number;
    description: string;
    all_day: boolean;
    external_id: string | null;
}
