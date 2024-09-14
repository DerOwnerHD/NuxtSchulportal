/**
 * The Notifications for all apps (the amount of notifications).
 * When the value is set to -1, the display is expected to show an error
 */
export const useNotifications = () => useState("app-notifications", () => new Map<AppID, number>());
export const useAppErrors = () => useState("app-errors", () => new Map<AppID, any>());
