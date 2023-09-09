const metricSessions: { [key: string]: { operation: string; start: number; } } = {};
export const operations: { [key: string]: { count: number; median: number; total: number; } } = {};

const debug = true;

export const start = (operation: string): string => {

    let date = performance.now();
    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx-xxxxxx3xx".replace(/[xy]/g, (char) => {
        const random = (date + Math.random() * 16) % 16 | 0;
        date = Math.floor(date / 16);
        return (char === "x" ? random : (random & 0x3 | 0x8)).toString(16);
    });

    metricSessions[uuid] = { operation, start: performance.now() };
    if (debug) 
        console.info(`[Metrics] Session of operation ${ operation } started`);

    return uuid;

}

export const end = (uuid: string): any => {

    const session = metricSessions[uuid];
    if (!session)
        return console.warn("[Metrics] ⚠ No Metric Session found for a given UUID");

    const { operation, start } = session;
    const timeElapsed = performance.now() - start;
    if (debug)
        console.info(`[Metrics] Session of operation ${ operation } ended after ${ timeElapsed }ms`);
    if (!operations[operation])
        return operations[operation] = { count: 1, median: timeElapsed, total: timeElapsed };

    let { count, median, total } = operations[operation];
    operations[operation] = { count: ++count, median: Math.round((total + timeElapsed) / count), total: total + timeElapsed  };
    if (debug)
        console.info(`[Metrics] Median of operation ${ operation }: ${ median }ms => ${ operations[operation].median }ms`);

}