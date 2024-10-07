import { SPHStatus } from "~/common";
import { getCachedDuration, getCachedValue, storeInCache } from "../cache";
import { BasicResponse, generateDefaultHeaders, removeBreaks, setErrorResponseEvent } from "../utils";
import { JSDOM } from "jsdom";
import { querySelectorArray } from "../dom";

interface Response extends BasicResponse {
    items: SPHStatus[];
    time_since_update: number | null;
}

export default defineEventHandler<Promise<Response>>(async (event) => {
    const cacheHit = getCachedValue<SPHStatus[]>("sph-status");
    if (cacheHit !== null)
        return {
            error: false,
            items: cacheHit,
            time_since_update: getCachedDuration("sph-status")
        };

    try {
        const response = await fetch("https://info.schulportal.hessen.de/status-des-schulportal-hessen/", {
            headers: {
                ...generateDefaultHeaders()
            },
            redirect: "manual"
        });

        if (response.status !== 200) return setErrorResponseEvent(event, 503);
        const acceptedContentType = /^text\/html(; ?charset=utf-?8)?$/i;
        if (!acceptedContentType.test(response.headers.get("Content-Type") ?? "")) return setErrorResponseEvent(event, 503);

        const {
            window: { document }
        } = new JSDOM(removeBreaks(await response.text()));

        const items = querySelectorArray<HTMLTableElement>(document, "table.status")
            .flatMap((table) => {
                const firstRow = querySelectorArray(table, "tr:first-child td");
                const secondRow = querySelectorArray(table, "tr:last-child td");
                if (firstRow.length !== secondRow.length) return [];
                return firstRow.map((element, index) => parseStatusTableEntry(element, secondRow[index], document));
            })
            .filter((item) => item !== null);

        storeInCache<SPHStatus[]>("sph-status", items);

        return {
            error: false,
            items,
            time_since_update: getCachedDuration("sph-status")
        };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});

function parseStatusTableEntry(header: Element, main: Element, document: Document) {
    const content = main.innerHTML.trim();
    const anchor = header.querySelector("a[href]");
    if (!anchor) return null;

    const id = anchor.getAttribute("href")?.split("#")[1];
    if (id === undefined) return null;

    const shortName = anchor.innerHTML.trim();

    const value: SPHStatus = {
        id: id.toLowerCase(),
        short_name: shortName,
        unavailable: content.includes("❗"),
        update_planned: content.includes("🛠")
    };

    const details = document.querySelector(`.so-widget-sow-editor:has(a#${id})`);
    if (!details) return value;

    const detailsHeader = details.querySelector("h2");
    const title = detailsHeader?.childNodes[1].textContent?.trim();
    const subtitle = detailsHeader?.querySelector("small")?.textContent?.replace(/^\(|\)$/g, "");

    value.full_name = title ?? undefined;
    value.subtitle = subtitle ?? undefined;

    const detailStrings = querySelectorArray(details, "table tr td:last-child");
    if (detailStrings.length !== 2) return value;

    // Attributes (classes, styles, etc.) are unwanted and are cleared out
    const [status, update] = detailStrings.map((element) =>
        element.innerHTML
            .replace(/<(\w+)(\s+[^>]*?)?>/gi, "<$1>")
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .trim()
    );

    value.status_string = status;
    value.update_string = update;

    return value;
}
