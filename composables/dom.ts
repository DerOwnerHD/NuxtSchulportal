export function querySelectorArray<T extends Element = Element>(element: Element | Document, selectors: string): T[] {
    return Array.from(element.querySelectorAll(selectors));
}
