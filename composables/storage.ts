/**
 * Gets, sets or removes an item from Local Storage
 * @param key Key of the localStorage to set or get
 * @param value The value or null to delete the value
 * @returns The value in the localStorage for that key
 */
export const useLocalStorage = (key: string, value?: string): void | string | null => {
    if (!("localStorage" in window)) return;

    if (value === undefined) return window.localStorage.getItem(key);

    if (value === null) return window.localStorage.removeItem(key);

    window.localStorage.setItem(key, value);
};
