console.log("[SW] Active");
self.addEventListener("push", async (event) => {
    const data = event.data.json();
    if (data === null) return;

    if (data.operation === "vplan") {
        await self.registration
            .getNotifications()
            .filter((notification) => notification.title === "Vertretungsplan")
            .forEach((notification) => notification.close());
        self.registration.showNotification("Vertretungsplan", {
            badge: "https://i.imgur.com/fNfBzeU.png",
            icon: "https://i.imgur.com/YD9WuC0.png",
            actions: [
                {
                    action: "open",
                    title: "Anzeigen",
                    icon: "https://i.imgur.com/E9ICBYC.png"
                }
            ],
            body: data.text,
            tag: "vplan"
        });
    } else if (data.operation === "hello") {
        self.registration.showNotification("Hallöchen da!", {
            body: "Nur ein kleiner Test um zu gucken ob denn alles funktioniert 🙂",
            icon: "https://i.imgur.com/YD9WuC0.png"
        });
        setTimeout(async () => {
            const notifications = await self.registration.getNotifications();
            notifications.forEach((notification) => notification.close());
        });
    }
});
self.addEventListener("notificationclick", async (event) => {
    if (event.action !== "open") return;
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: "window" }).then((clientList) => {
            for (const client of clientList) {
                const url = new URL(client.url);
                if (url.pathname === "/" && "focus" in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow("/");
        })
    );
});
