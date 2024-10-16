import type { AnyFunction, IconDefinition } from "~/common";
import { createVNode, render } from "vue";
import SmallFlyout from "~/components/overlay/SmallFlyout.vue";

export interface FlyoutProperties {
    style?: "small";
    groups: FlyoutGroup[];
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

/**
 * By creating a wrapper for each overlay/flyout, multiple
 * can be visible at the same time.
 *
 * Calling Vue's internal {@link render} function
 * causes only that component to render inside.
 *
 * => multiple components like that in one wrapper are impossible
 *
 * This wrapper also gets removed when the overlay closes.
 */
function createOverlayWrapper() {
    const parent = document.querySelector("#overlay-wrapper");
    if (parent === null) return null;
    const el = document.createElement("div");
    parent.append(el);
    return el;
}

function getFlyoutStyle(style: string = "small") {
    switch (style) {
        case "small":
            return SmallFlyout;
        default:
            throw new TypeError("[Flyout] Received style of unknown type!");
    }
}

export async function createFlyout(properties: FlyoutProperties, parent: Element | null): Promise<RegisteredFlyoutMetadata | null> {
    if (parent === null) throw new ReferenceError("[Flyout] Cannot create without parent");
    const wrapper = createOverlayWrapper();
    if (wrapper === null) throw new ReferenceError("[Flyout] Could not get wrapper for overlays");

    const vnode = createVNode(getFlyoutStyle(properties.style), { properties });
    render(vnode, wrapper);

    await nextTick();

    const dimensions = vnode.component?.exposed?.getDimensions();
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

    vnode.component?.exposed?.inputPosition([clampNumber(x, MARGIN_TO_SCREEN_BORDER, window.innerWidth - MARGIN_TO_SCREEN_BORDER - width), y]);

    await nextTick();

    const updatedDim = vnode.component?.exposed?.getDimensions() as DOMRect | undefined;
    if (!(updatedDim instanceof DOMRect)) {
        resolveFlyout(wrapper);
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

    await vnode.component?.exposed?.inputTransform(
        // The origin from which the flyout is supposed to animate in.
        // i.e., if is spawns at the top of the parent, it should animate in from the bottom.
        [shouldSpawnOnRightSide ? "right" : "left", verticalAlignment === "top" || isAboveParent ? "bottom" : "top"]
    );

    vnode.component?.exposed?.addCloseListener(() => resolveFlyout(wrapper));

    return {
        addCloseListener: vnode.component?.exposed?.addCloseListener,
        requestClose: vnode.component?.exposed?.requestClose,
        id: properties.id
    };
}

export interface RegisteredFlyoutMetadata {
    addCloseListener: ListenerAddFunction;
    requestClose: AnyFunction;
    id?: string;
}

function resolveFlyout(wrapper: Element) {
    render(null, wrapper);
    wrapper.remove();
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
