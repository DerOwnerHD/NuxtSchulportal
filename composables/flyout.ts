export const useFlyout = () => useState<Flyout>("flyout-data");

export interface Flyout {
    title?: string;
    position: number[];
    origin?: "top" | "bottom";
    orientation?: "left" | "right";
    id: string;
    element?: Element;
    groups: FlyoutGroups;
}

export type FlyoutGroups = {
    title: string;
    text?: string;
    icon?: string[];
    action?: Function;
    disabled?: boolean;
}[][];

export const FLYOUT_WIDTH = 190;
