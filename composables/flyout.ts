import type { AnyFunction } from "~/common";

export const useFlyout = () => useState<Flyout>("flyout-data");

export interface Flyout {
    title?: string;
    position: number[];
    origin?: "top" | "bottom";
    orientation?: "left" | "right";
    element?: Element;
    groups: FlyoutGroups;
}

export type FlyoutGroups = {
    title: string;
    text?: string;
    icon?: string[];
    action?: AnyFunction;
    disabled?: boolean;
}[][];

export const FLYOUT_WIDTH = 190;
