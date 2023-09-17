console.log("[SW] Active");
self.addEventListener("push", async (event) => {
    const data = event.data.json();
    if (data === null) return;

    if (data.operation === "vplan")
        self.registration.showNotification("Vertretungsplan", { body: data.text, icon: "https://i.imgur.com/YD9WuC0.png" });
});
