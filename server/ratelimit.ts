const wait = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

const rateLimits: RouteRateLimit[] = [
    {
        route: "/api/login.post",
        interval: 15 * 1000,
        allowedPerInterval: 3,
        clients: []
    },
    {
        route: "/api/check.get",
        interval: 5 * 1000,
        allowedPerInterval: 2,
        clients: []
    },
    {
        route: "/api/resetpassword.post",
        interval: 60 * 1000,
        allowedPerInterval: 1,
        clients: []
    },
    {
        route: "/api/resetpassword.put",
        interval: 60 * 1000,
        allowedPerInterval: 1,
        clients: []
    },
    {
        route: "/api/moodle/login.post",
        interval: 10 * 1000,
        allowedPerInterval: 2,
        clients: []
    },
    {
        route: "/api/moodle/conversations.get",
        interval: 5 * 1000,
        allowedPerInterval: 3,
        clients: []
    },
    {
        route: "/api/moodle/messages.get",
        interval: 10 * 1000,
        allowedPerInterval: 5,
        clients: []
    },
    {
        route: "/api/moodle/courses.get",
        interval: 15 * 1000,
        allowedPerInterval: 3,
        clients: []
    },
    {
        route: "/api/moodle/events.get",
        interval: 15 * 1000,
        allowedPerInterval: 3,
        clients: []
    },
    {
        route: "/api/moodle/check.get",
        interval: 5 * 1000,
        allowedPerInterval: 2,
        clients: []
    },
    {
        route: "/api/stundenplan.get",
        interval: 10 * 1000,
        allowedPerInterval: 2,
        clients: []
    },
    {
        route: "/api/vertretungen.get",
        interval: 10 * 1000,
        allowedPerInterval: 2,
        clients: []
    },
    {
        route: "/api/autologin.post",
        interval: 20 * 1000,
        allowedPerInterval: 2,
        clients: []
    },
    {
        route: "/api/notifications.post",
        interval: 20 * 1000,
        allowedPerInterval: 1,
        clients: []
    },
    {
        route: "/api/notifications.delete",
        interval: 20 * 1000,
        allowedPerInterval: 1,
        clients: []
    },
    {
        route: "/api/decryption.get",
        interval: 20 * 1000,
        allowedPerInterval: 1,
        clients: []
    },
    {
        route: "/api/mylessons/courses.get",
        interval: 15 * 1000,
        allowedPerInterval: 3,
        clients: []
    },
    {
        route: "/api/mylessons/homework.post",
        interval: 10 * 1000,
        allowedPerInterval: 2,
        clients: []
    },
    {
        route: "/api/moodle/notifications.get",
        interval: 15 * 1000,
        allowedPerInterval: 3,
        clients: []
    },
    {
        route: "/api/messages.get",
        interval: 15 * 1000,
        allowedPerInterval: 2,
        clients: []
    },
    {
        route: "/api/message.get",
        interval: 10 * 1000,
        allowedPerInterval: 3,
        clients: []
    }
];

export enum RateLimitAcceptance {
    Forbidden,
    Rejected,
    Allowed
}

interface RouteRateLimit {
    route: string;
    interval: number;
    allowedPerInterval: number;
    clients: RateLimitClient[];
}

interface RateLimitClient {
    address: string;
    counter: number;
}

/**
 * Checks whether the given client's IP is allowed to make a request
 * to the given route or not due to some rate limiting on the route.
 * If there is no rate limit for this route, it is always allowed.
 * @param route The API route to check for like /api/login
 * @param address The IP address (IPv4 or IPv6 of the client)
 * @param key The Rate Limit bypass key
 * @returns Whether the request can pass or is denied (May also be forbidden if no IP is given)
 */
export const handleRateLimit = (route: string, address?: string, key?: string | string[]): RateLimitAcceptance => {
    if (useRuntimeConfig().private.rateLimitBypass === (Array.isArray(key) ? key.join("") : key)) return RateLimitAcceptance.Allowed;
    if (!address) return RateLimitAcceptance.Forbidden;

    const routeIndex = rateLimits.findIndex((x) => x.route === route);
    // If a route isn't configured but still is requesting
    // this, we might just want to accept it in any way
    if (routeIndex === -1) return RateLimitAcceptance.Allowed;

    const routeLimits = rateLimits[routeIndex];
    const client: RateLimitClient = routeLimits.clients.find((x) => x.address === address)!;

    const clientIndex = rateLimits[routeIndex].clients.findIndex((x) => x.address === address);

    // We can safely just allow it to pass as there should be no problem
    // by just one request if the user doesn't already exist in the data
    if (!client) {
        rateLimits[routeIndex].clients.push({ address, counter: 1 });
        const index = rateLimits[routeIndex].clients.findIndex((x) => x.address === address);
        // Some weird error if it wasn't added
        if (index === -1) return RateLimitAcceptance.Rejected;
        wait(routeLimits.interval).then(() => rateLimits[routeIndex].clients[index].counter--);
        return RateLimitAcceptance.Allowed;
    }

    if (client.counter >= routeLimits.allowedPerInterval) return RateLimitAcceptance.Rejected;

    client.counter++;
    rateLimits[routeIndex].clients[clientIndex] = client;

    wait(routeLimits.interval).then(() => rateLimits[routeIndex].clients[clientIndex].counter--);
    return RateLimitAcceptance.Allowed;
};
