export interface SPHStatus {
    id: string;
    unavailable: boolean;
    update_planned: boolean;
    short_name: string;
    full_name?: string;
    subtitle?: string;
    status_string?: string;
    update_string?: string;
}

/**
 * See https://info.schulportal.hessen.de/status-des-schulportal-hessen/ for these items
 */
export type SPHStatusKey = "login" | "paedorg" | "lernsys" | "paednet" | "bs" | "support";

export type AnyFunction = () => Promise<any> | any;

export type Nullable<T> = T | null;

export type SerializableObjects = Record | number | string | null | Array;
