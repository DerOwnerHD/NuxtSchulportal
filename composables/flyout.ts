import type { AnyFunction, IconDefinition } from "~/common";
import { h } from "vue";
import SmallFlyout from "~/components/overlay/SmallFlyout.vue";
import LargeFlyout from "~/components/overlay/LargeFlyout.vue";

type FlyoutStyle = "small" | "large";
interface FlyoutPropertiesBase {
    style?: FlyoutStyle;
    /**
     * Used to identify a chained flyout to prevent opening it multiple times.
     */
    id?: string;
    /**
     * The position related to the parent at which the flyout should spawn.
     * If i.e. "top" is passed, the flyout will be spawned at the top of parent.
     */
    forced_position?: {
        /**
         * Spawns the flyout directly at the side of the parent.
         * Allows the constructor function to still choose which side is ideal.
         */
        direction?: "sides";
        vertical?: "top" | "bottom";
        /**
         * top refers to left, bottom to right!
         */
        horizontal?: "top" | "bottom";
    };
}

export interface SmallFlyoutProperties extends FlyoutPropertiesBase {
    style?: "small";
    groups: FlyoutGroup[];
}

export interface LargeFlyoutProperties extends FlyoutPropertiesBase {
    style: "large";
    /**
     * The component name to look up
     */
    content: Component;
    content_props?: Record<string, any>;
}
export type FlyoutProperties = SmallFlyoutProperties | LargeFlyoutProperties;

export interface FlyoutGroup {
    title?: string;
    items: (FlyoutDefaultItem | FlyoutExpandItem)[];
}

interface FlyoutItem {
    title?: string;
    text?: string;
    disabled?: boolean;
    type?: string;
}

interface FlyoutDefaultItem extends FlyoutItem {
    type?: "default";
    icon?: IconDefinition;
    action?: AnyFunction;
}

/**
 * Allows to create an item, which, if hovered, opens another
 * flyout to reveal more content.
 */
interface FlyoutExpandItem extends FlyoutItem {
    type: "expand";
    /**
     * When passing a chained flyout, it is highly recommended
     * to force it to spawn at a sideways position
     */
    chained_flyout: FlyoutGroup[];
}

const MARGIN_TO_SCREEN_BORDER = 16;

function getFlyoutStyle(style: FlyoutStyle = "small"): Component {
    switch (style) {
        case "small":
            return SmallFlyout;
        case "large":
            return LargeFlyout;
        default:
            throw new TypeError("[Flyout] Received style of unknown type!");
    }
}

export type HorizontalOrigin = "left" | "right";
export type VerticalOrigin = "top" | "bottom";

interface ExposedFunctions {
    getDimensions: () => DOMRect | null;
    inputPosition: (coords: number[]) => void;
    inputTransform: (origin: [HorizontalOrigin, VerticalOrigin]) => Promise<void>;
    addCloseListener: ListenerAddFunction;
    requestClose: () => void;
}
type ResolveFn = (data: ExposedFunctions) => void;
interface FlyoutCreationMeta {
    vnode: VNode;
    callback: ResolveFn;
}
export const useFlyoutMap = () => useState("flyout-map", () => new Map<string, FlyoutCreationMeta>());

export async function createFlyout(properties: FlyoutProperties, parent: Element | null): Promise<RegisteredFlyoutMetadata | null> {
    if (parent === null) throw new ReferenceError("[Flyout] Cannot create without parent");

    const map = useFlyoutMap();
    const uuid = useRandomUUID();
    const vnode = h(getFlyoutStyle(properties.style), { properties });

    let fn: ResolveFn | null = null;
    const promise = new Promise((resolve: ResolveFn) => (fn = resolve));
    if (!fn) return null;

    /**
     * Using Vue's internal *render* function causes the component to not inherit the Nuxt context.
     * As that is required to use ANY composables, the vnode is mounted in the layout using <component :is>.
     *
     * That includes a ref prop with a function, returning the exposed functions from the component.
     * This function awaits that promise and then continues on as normal.
     *
     * The vnode variable created above does not update itself if it is mounted somewhere.
     */
    map.value.set(uuid, { vnode, callback: fn });

    const functions = await promise;

    const dimensions = functions.getDimensions();
    if (!(dimensions instanceof DOMRect)) throw new ReferenceError("[Flyout] Failed to load dimensions");

    const parentDim = parent.getBoundingClientRect();
    const { height, width } = dimensions;

    const verticalAlignment = properties.forced_position?.vertical ?? decideAlignment(window.innerHeight, parentDim.height, parentDim.top, height);
    const horizontalAlignment = properties.forced_position?.horizontal ?? decideAlignment(window.innerWidth, parentDim.width, parentDim.left, width);

    const x =
        properties.forced_position?.direction === "sides"
            ? horizontalAlignment === "top"
                ? parentDim.left - width
                : horizontalAlignment === "bottom"
                  ? parentDim.left + parentDim.width
                  : MARGIN_TO_SCREEN_BORDER
            : parentDim.left;
    const y =
        verticalAlignment === "top"
            ? parentDim.top - height
            : verticalAlignment === "bottom"
              ? parentDim.top + parentDim.height
              : // In the worst case, when "absolute" is requested, the
                // flyout is aligned to the screen top
                MARGIN_TO_SCREEN_BORDER;

    const horizontalCenterOfParent = parentDim.left + parentDim.width / 2;

    functions.inputPosition([clampNumber(x, MARGIN_TO_SCREEN_BORDER, window.innerWidth - MARGIN_TO_SCREEN_BORDER - width), y]);

    await nextTick();

    const updatedDim = functions.getDimensions() as DOMRect | undefined;
    if (!(updatedDim instanceof DOMRect)) {
        resolveFlyout(uuid);
        return null;
    }
    /**
     * The flyout should, by default, transform up from the left side of the parent, unless:
     *  - the offset left from the edge of the flyout to the center of the parent is larger than the same on the
     *  right.
     *
     *      should come from LEFT:             should come from RIGHT:
     *       /-------\                                 /-------\
     *       |       |  <- flyout                      |       |
     *       |       |                                 |       |
     *       \-------/                                 \-------/
     *         AA       <- parent                             BB
     *
     * This is of no real relevance as it is only visible for a few hundred ms. Still - nice to have.
     */
    //
    const shouldSpawnOnRightSide = horizontalCenterOfParent - updatedDim.left > updatedDim.left + width - horizontalCenterOfParent;

    const isAboveParent = updatedDim.top + height < parentDim.top + parentDim.height / 2;

    await functions.inputTransform(
        // The origin from which the flyout is supposed to animate in.
        // i.e., if is spawns at the top of the parent, it should animate in from the bottom.
        [shouldSpawnOnRightSide ? "right" : "left", verticalAlignment === "top" || isAboveParent ? "bottom" : "top"]
    );

    functions.addCloseListener(() => resolveFlyout(uuid));

    return {
        addCloseListener: functions.addCloseListener,
        requestClose: functions.requestClose,
        id: properties.id
    };
}

export interface RegisteredFlyoutMetadata {
    addCloseListener: ListenerAddFunction;
    requestClose: AnyFunction;
    id?: string;
}

export function resolveFlyout(uuid: string) {
    const map = useFlyoutMap();
    map.value.delete(uuid);
}

type ListenerAddFunction = (cb: AnyFunction) => void;

export async function createChainedFlyout(groups: FlyoutGroup[], el: Element | null, id?: string) {
    if (el === null) return null;
    return await createFlyout({ groups, id, style: "small", forced_position: { direction: "sides" } }, el);
}

type Alignment = "top" | "bottom" | "absolute";

function decideAlignment(screenSize: number, parentSize: number, parentOffset: number, flyoutSize: number): Alignment {
    const totalHeight = parentOffset + parentSize + flyoutSize;
    // Positioning the flyout BELOW/RIGHT of the parent. There is enough space for it.
    if (totalHeight <= screenSize - MARGIN_TO_SCREEN_BORDER) return "bottom";
    // Positioning the flyout ABOVE/LEFT of the parent. Still, the margin to the border should be preserved.
    if (parentOffset >= flyoutSize + MARGIN_TO_SCREEN_BORDER) return "top";
    // If none of both options are possible, the flyout should be aligned absolutely over the whole screen.
    return "absolute";
}
