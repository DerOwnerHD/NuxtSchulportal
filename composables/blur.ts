/**
 * This indicates the amount of pixels we can "combine" when squared. We just skip over most of the
 * pixels and just care about one of them. Actually blurring them all together would be far too
 * computationally expensive. So this ain't no real blur.
 */
const BLUR_STRENGTH = 4;
const RGB_MAX_VALUE = 0xffffff;
/**
 *
 * @param primary The color which is placed in the center
 * @param secondary The color which fills the rest of the screen
 * @param overlay The color (with alpha) that needs to be overlayed (so for a backdrop blur)
 * @returns An image URL which can be embedded in a background and be sliced
 */
export function generateBlurForRadialGradient(primary: number, secondary: number, overlay: number) {
    const canvas = document.createElement("canvas");
    const width = window.innerWidth;
    const height = window.innerHeight;

    const origin = [width / 2, height / 2].map((x) => Math.ceil(x));
    const steps = origin.map((x) => Math.ceil(x / BLUR_STRENGTH));

    canvas.width = steps[0] * 2;
    canvas.height = steps[1] * 2;

    const context = canvas.getContext("2d");
    if (context === null) throw new ReferenceError("Could not create 2d canvas context for radial gradient blur generator");
    const image = context.createImageData(steps[0], steps[1]);

    if (overlay <= RGB_MAX_VALUE) throw new RangeError("No alpha value given for overlay");

    const primaryChannels = getRGBValues(primary);
    const secondaryChannels = getRGBValues(secondary);
    const overlayChannels = getRGBAValues(overlay);

    const overlayOpacityPercentage = overlayChannels[3] / 255;

    const difference = primaryChannels.map((channel, index) => channel - secondaryChannels[index]);
    for (let y = 0; y < steps[1]; y++) {
        for (let x = 0; x < steps[0]; x++) {
            const percentages = [x, y].map((coordinate, index) => clampNumber((coordinate * BLUR_STRENGTH) / origin[index], 0, 1));
            const xAxisColor = difference.map((channel) => Math.floor(channel * percentages[0]));
            const yAxisColor = difference.map((channel) => Math.floor(channel * percentages[1]));
            const combinedAxis = xAxisColor.map((x, index) => Math.floor((x + yAxisColor[index]) / 2));
            const withOverlay = combinedAxis.map((channel, index) =>
                Math.floor(channel * (1 - overlayOpacityPercentage) + overlayChannels[index] * overlayOpacityPercentage)
            );
            const index = (steps[0] * y + x) * 4;
            image.data[index] = withOverlay[0];
            image.data[index + 1] = withOverlay[1];
            image.data[index + 2] = withOverlay[2];
            image.data[index + 3] = 255;
        }
    }

    const topRight = new ImageData(steps[0], steps[1]);
    const bottomLeft = new ImageData(steps[0], steps[1]);
    const bottomRight = new ImageData(steps[0], steps[1]);
    for (let y = 0; y < steps[1]; y++) {
        for (let x = 0; x < steps[0]; x++) {
            const index = (y * steps[0] + x) * 4;
            const channels = image.data.slice(index, index + 4);
            const bottomLeftIndex = (y * steps[0] + (steps[0] - x - 1)) * 4;
            const topRightIndex = ((steps[1] - y - 1) * steps[0] + x) * 4;
            const bottomRightIndex = ((steps[1] - y - 1) * steps[0] + (steps[0] - x - 1)) * 4;
            bottomLeft.data.set(channels, bottomLeftIndex);
            topRight.data.set(channels, topRightIndex);
            bottomRight.data.set(channels, bottomRightIndex);
        }
    }

    context.putImageData(image, 0, 0);
    context.putImageData(bottomLeft, steps[0], 0);
    context.putImageData(topRight, 0, steps[1]);
    context.putImageData(bottomRight, steps[0], steps[1]);
    return canvas.toDataURL();
}

export function getRGBValues(color: number) {
    return [color >> 16, (color >> 8) & 0xff, color & 0xff];
}

function getRGBAValues(color: number) {
    return [color >> 24, color >> 16, color >> 8, color].map((channel) => channel & 0xff);
}

export function multiplyRGBValues(channels: number[], multiplier: number) {
    return channels.map((channel) => channel * multiplier);
}

export function combineRGBValues(channels: number[]) {
    return "#" + channels.map((channel) => Math.floor(channel).toString(16).padStart(2, "0")).join("");
}

export function clampNumber(number: number, min: number, max: number) {
    return Math.min(Math.max(number, min), max);
}
