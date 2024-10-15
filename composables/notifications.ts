import type { AnyFunction } from "~/common";

/**
 * The Notifications for all apps (the amount of notifications).
 * When the value is set to -1, the display is expected to show an error
 */
export const useNotifications = () => useState("app-notifications", () => new Map<AppID, number>());
export function clearNotifications(id: AppID) {
    const map = useNotifications();
    void map.value.delete(id);
}
export function setNotificationCount(id: AppID, count: number) {
    const map = useNotifications();
    void map.value.set(id, count);
}
export interface AppErrorMetadata {
    error: any;
    is_reauth_required?: boolean;
    /**
     * In ms, after what time a new request to that API endpoint is possible.
     */
    next_request_after?: number;
    retry_function?: AnyFunction;
}
export const useAppErrors = () => useState("app-errors", () => new Map<AppID, AppErrorMetadata>());
export function hasAppError(id: AppID) {
    const map = useAppErrors();
    return map.value.has(id);
}
export function createAppError(id: AppID, error: any, retryFunction?: AnyFunction, reauthOverwrite?: boolean) {
    const map = useAppErrors();
    void map.value.set(id, {
        error: parseResponseError(error),
        retry_function: retryFunction,
        next_request_after: getRateLimitExpire(error),
        is_reauth_required: reauthOverwrite ?? checkForReauthRequirement(error)
    });
}
export function clearAppError(id: AppID) {
    const map = useAppErrors();
    void map.value.delete(id);
}
/**
 * Attempts to parse the error data returned by a $fetch call by either trying to read the
 * error_details field provided by the server, a message field or just using the error as is.
 * @param error The error supplied using the catch block
 * @returns Any data that might be of use
 */
export function parseResponseError(error: any) {
    if (typeof error !== "object" || error === null) return error;
    return error?.data?.error_details ?? error?.data?.message ?? error?.message ?? error?.name ?? error;
}

/**
 * Checks whether a re-auth should be performed depending on the response's status code.
 * @param error The error supplied using the catch block
 * @returns
 */
export function checkForReauthRequirement(error: any) {
    return error?.status === 401;
}

export function getRateLimitExpire(error?: any): number | undefined {
    if (error?.status !== 429) return undefined;
    return error?.data?.next_request_after ?? undefined;
}
