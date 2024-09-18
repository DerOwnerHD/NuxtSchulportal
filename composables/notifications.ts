import type { AnyFunction } from "~/common";

/**
 * The Notifications for all apps (the amount of notifications).
 * When the value is set to -1, the display is expected to show an error
 */
export const useNotifications = () => useState("app-notifications", () => new Map<AppID, number>());
interface AppErrorMetadata {
    error: any;
    is_reauth_required?: boolean;
    retry_function?: AnyFunction;
}
export const useAppErrors = () => useState("app-errors", () => new Map<AppID, AppErrorMetadata>());
export function hasAppError(id: AppID) {
    const map = useAppErrors();
    return map.value.has(id);
}
export function createAppError(id: AppID, error: any, retryFunction?: AnyFunction, isReauthRequired?: boolean) {
    const map = useAppErrors();
    map.value.set(id, { error, retry_function: retryFunction, is_reauth_required: isReauthRequired });
}
export function clearAppError(id: AppID) {
    const map = useAppErrors();
    map.value.delete(id);
}
