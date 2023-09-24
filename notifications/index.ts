import express, { Request } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { spawn } from "child_process";
import webpush, { WebPushError } from "web-push";
import os from "os";
dotenv.config();
const app = express();

interface VertretungsDay {
    date: string;
    day: string;
    day_of_week: string;
    relative: "heute" | "morgen" | "";
    vertretungen: Vertretung[];
    news: string[];
}

interface Vertretungsplan {
    days: VertretungsDay[];
    last_updated: string | null;
    updating: boolean;
    error: boolean;
}

interface Vertretung {
    lessons: {
        list: number[];
        from: number;
        to: number;
    };
    class: string | null;
    substitute: string | null;
    teacher: string | null;
    subject: string | null;
    subject_old: string | null;
    room: string | null;
    note: string | null;
}

const Notification = mongoose.model(
    "Notification",
    new mongoose.Schema({
        autologin: String,
        token: String,
        user: String,
        endpoint: String,
        p256dh: String,
        auth: String,
        plan: Object
    })
);

app.use(express.json());
const { PUBLIC_KEY, PRIVATE_KEY } = process.env;
if (!PUBLIC_KEY || !PRIVATE_KEY) throw new ReferenceError("VAPID keys not set");
webpush.setVapidDetails("mailto:admin@example.com", PUBLIC_KEY, PRIVATE_KEY);

const patterns = {
    AUTH: /^[a-z0-9_-]{22}$/i,
    P256DH: /^B[a-z0-9_-]+$/i,
    AUTOLOGIN: /^[a-f0-9]{64}$/
};

app.post("/", async (req, res) => {
    if (!checkKey(req) || !connected) return res.status(401).send({ error: true });
    if (!connected) return res.status(503).send({ error: true });
    if (!testPatterns(req, true)) return res.status(400).send({ error: true });
    try {
        const result = await webpush.sendNotification(
            {
                endpoint: req.body.endpoint,
                keys: {
                    p256dh: req.body.p256dh,
                    auth: req.body.auth
                }
            },
            JSON.stringify({ operation: "hello" })
        );
        if (result.statusCode !== 201) return res.send(410).send({ error: true });
    } catch (error) {
        return res.status(410).send({ error: true });
    }
    console.log(consoleTime() + "💾 Added subscription");
    await new Notification({ ...req.body, token: null }).save();
    res.send({ error: false });
});

app.delete("/", async (req, res) => {
    if (!checkKey(req)) return res.status(401).send({ error: true });
    if (!connected) return res.status(503).send({ error: true });
    if (!testPatterns(req, false)) return res.status(400).send({ error: true });
    const deleted = await Notification.findOneAndDelete({ ...req.body });
    if (!deleted) return res.status(404).send({ error: true });
    console.log(consoleTime() + "📀 Deleted subscription");
    res.send({ error: false });
});

const knownSubscriptionServices = [
    "android.googleapis.com",
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "updates-autopush.stage.mozaws.net",
    "updates-autopush.dev.mozaws.net",
    ".*\\.notify.windows.com",
    ".*\\.push.apple.com"
].map((service) => new RegExp(`^${service.replace("*", ".*")}$`, "i"));

const isSubscriptionService = (host: string) => knownSubscriptionServices.some((pattern) => pattern.test(host));

const checkKey = (req: Request) => req.headers.authorization === process.env.KEY;

const testPatterns = (req: Request, testForAutologin: boolean) => {
    if (!req.body) return false;
    const { endpoint, p256dh, auth, autologin, user } = req.body;
    if (!endpoint || !p256dh || !auth) return false;
    try {
        const url = new URL(endpoint);
        if (!isSubscriptionService(url.host)) return false;
    } catch (error) {
        return false;
    }
    if (user && typeof user !== "string") return false;
    const authValid = patterns.P256DH.test(p256dh) && patterns.AUTH.test(auth);
    if (!authValid && !testForAutologin) return false;
    return authValid && patterns.AUTOLOGIN.test(autologin);
};

app.all("/", (req, res) => {
    res.status(405).send({ error: true });
});

app.listen(process.env.PORT, () => console.log(consoleTime() + `🌐 Listening on :${process.env.PORT}`));

let connected = false;
async function connect() {
    const { DATABASE_URL, DATABASE_SHARD, RATELIMIT_BYPASS, API_URL } = process.env;
    if (!DATABASE_URL || !DATABASE_SHARD) throw new ReferenceError("Database URL and/or shard not set");
    if (!RATELIMIT_BYPASS) throw new ReferenceError("Ratelimit Bypass key not set");
    if (!API_URL) throw new ReferenceError("API URL not set");

    try {
        await mongoose.connect(DATABASE_URL);
        console.log(consoleTime() + "💾 Connected to database");
    } catch (error) {
        console.error(error);
        if (os.platform() !== "win32") spawn("kill", ["1"]);
        return;
    }

    connected = true;
    setInterval(async () => {
        const subscriptions = await Notification.find({});
        console.log(consoleTime() + `👤 Loaded ${subscriptions.length} subscription(s)`);
        if (!subscriptions.length) return;
        let i = 0;

        const interval: NodeJS.Timeout = setInterval(
            async () => {
                async function attemptLogin() {
                    const start = performance.now();
                    try {
                        console.log(consoleTime() + `⌛ Attempting login for user ${i}`);
                        const response = await fetch(`${API_URL}/autologin`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "X-RateLimit-Bypass": RATELIMIT_BYPASS ?? ""
                            },
                            body: JSON.stringify({ autologin: subscription.autologin })
                        });
                        const data = await response.json();
                        if (data.error || !data.token) {
                            console.log(consoleTime() + `❌ Login failed for user ${i}`);
                            if (response.status === 401) await subscription.deleteOne();
                            return;
                        }
                        console.log(consoleTime() + `✅ Login for user ${i} succeeded after ${Math.floor(performance.now() - start)}ms`);
                        await subscription.$set("token", data.token).save();
                    } catch (error) {
                        console.log(consoleTime() + `❌ Login failed for user ${i}`);
                    }
                }

                const subscription = subscriptions[i++];
                if (!subscription) return clearInterval(interval);
                if (!subscription.token) return await attemptLogin();

                const { endpoint, auth, p256dh } = subscription;
                if (!endpoint || !auth || !p256dh) return;

                console.log(consoleTime() + `⌛ Loading vplan for user ${i}`);
                try {
                    const response = await fetch(`${API_URL}/vertretungen`, {
                        method: "GET",
                        headers: {
                            Authorization: subscription.token,
                            "X-RateLimit-Bypass": RATELIMIT_BYPASS ?? ""
                        }
                    });
                    if (response.status === 401) return await attemptLogin();
                    const plan = (await response.json()) as Vertretungsplan;
                    const oldPlan = subscription.plan as Vertretungsplan;

                    const buildDay = (day: VertretungsDay) =>
                        `${day.day_of_week}, der ${day.day.split("-").reverse().join(".")}:\n${
                            day.vertretungen
                                .map(
                                    ({ lessons, subject, subject_old, substitute, teacher, room, note }) =>
                                        `・ ${lessons.from + "." + (lessons.to ? " - " + lessons.to + "." : "")} Stunde: ${
                                            subject || subject_old
                                        } bei ${substitute || "<niemand>"}${teacher ? ` (${teacher.replace(/(<(\/)?del>)+/g, "")})` : ""} in Raum ${
                                            room ?? "-"
                                        }${note ? ` [${note}]` : ""}`
                                )
                                .join("\n") || "Keine Vertretungen 😭"
                        }\n`;

                    const dayHasChanged = (day: VertretungsDay, oldDay: VertretungsDay) =>
                        JSON.stringify(day.vertretungen) !== JSON.stringify(oldDay.vertretungen);

                    // We don't want to save that plan most likely
                    if (!plan.days.length) return;

                    let text = null;
                    if (!oldPlan) text = plan.days.map(buildDay).join("\n");
                    else {
                        const daysFoundInOldPlan = plan.days.reduce((acc, day) => (acc += oldPlan.days.find((x) => x.day === day.day) ? 1 : 0), 0);
                        if (daysFoundInOldPlan !== plan.days.length) text = plan.days.map(buildDay).join("\n");
                        else {
                            const anyDayHasChanged = plan.days.reduce((acc, day) => {
                                const partner = oldPlan.days.find((x) => x.day === day.day);
                                if (!partner) return true;
                                if (dayHasChanged(day, partner)) return true;

                                return acc;
                            }, false);
                            if (anyDayHasChanged) text = plan.days.map(buildDay).join("\n");
                        }
                    }

                    await subscription.$set("plan", plan).save();
                    if (text == null || text === "") return console.log(consoleTime() + `❌ No new data for user ${i}`);
                    console.log(consoleTime() + `✅ New data for user ${i}`);
                    await webpush
                        .sendNotification(
                            {
                                endpoint: endpoint,
                                keys: {
                                    p256dh: p256dh,
                                    auth: auth
                                }
                            },
                            JSON.stringify({ operation: "vplan", text })
                        )
                        .catch(async (error: WebPushError) => {
                            if (error.statusCode !== 410) return;
                            await subscription.deleteOne();
                            console.log(consoleTime() + `📀 Removed user ${i} due to invalid endpoint`);
                        });
                } catch (error) {
                    console.error(error);
                    console.log(consoleTime() + `❌ Loading vplan failed for user ${i}`);
                }
            },
            60000 / (subscriptions.length + 1)
        );
    }, 60000);

    if (os.platform() === "win32") return;
    setInterval(
        async () =>
            await fetch(DATABASE_SHARD).catch((error) => {
                // We expect this request to time out, but not to do anything else
                if (error.cause?.code === "UND_ERR_CONNECT_TIMEOUT") return;
                console.log(consoleTime() + "Killing process");
                spawn("kill", ["1"]);
            }),
        60000
    );
}

const consoleTime = () => {
    const time = new Date();
    const units = [time.getHours(), time.getMinutes(), time.getSeconds()].map((unit) => String(unit).padStart(2, "0"));
    return `[${units[0]}:${units[1]}:${units[2]}] `;
};

connect();
