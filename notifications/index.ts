import express, { Request } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { spawn } from "child_process";
import webpush, { WebPushError } from "web-push";
import os from "os";
import { appendFile } from "fs/promises";
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
    if (!testForAutologin) return authValid;
    return authValid && patterns.AUTOLOGIN.test(autologin);
};

app.all("/", (req, res) => {
    res.status(405).send({ error: true });
});

const daysOfWeek = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
function removeDelElement(text: string | null) {
    if (text === null) return;
    return text?.replace(/<\/?del>/gi, "").trim();
}

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
        const now = new Date();
        // Why we doin' this? Just dont wanna run ping the SPH like a bot <- (it is a bot lol)
        // at 3am when there is OBVIOUSLY nothing changing about the plan
        // Also, past a certain time, there is no need to perform this every minute
        if (now.getUTCHours() > 16 || now.getUTCHours() < 5 || (now.getUTCHours() > 12 && now.getUTCMinutes() % 2 === 0)) return;
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

                    const buildDay = (day: VertretungsDay) => {
                        const index = plan.days.indexOf(day);
                        // The day is stored as yyyy-mm-dd and there should
                        // only be a line break when this is not the first day
                        const title = `${index > 0 ? "\n" : ""}${day.day_of_week}, der ${day.day.split("-").reverse().join(".")}:\n`;
                        const substitutions = day.vertretungen.map(({ lessons, subject, subject_old, substitute, teacher, room, note }) => {
                            // Only subject_old will be filled when the class is cancelled
                            const isCancelled = substitute === null && subject === null && subject_old;
                            // Used i.e. for some notes like "Raumwechsel" or "Digitalunterricht"
                            // -> thus no need to show the teacher if they haven't changed
                            const sameTeacher = removeDelElement(teacher) === substitute;
                            const substituteTeacher = !sameTeacher && substitute ? ` bei ${substitute}` : "";
                            const hasMultipleLessons = lessons.list.length > 1;
                            const fromTo = hasMultipleLessons ? lessons.from + "-" + lessons.to : lessons.from;
                            return `・ [${fromTo}] ${isCancelled ? "Ausfall in " : ""}${subject || subject_old}${substituteTeacher}${
                                room ? ` in Raum ${room}` : ""
                            }${note ? ` (${note})` : ""}`;
                        });
                        return title + (substitutions.join("\n") || "Keine Vertretungen 😭");
                    };

                    const dayHasChanged = (day: VertretungsDay, oldDay: VertretungsDay) =>
                        JSON.stringify(day.vertretungen) !== JSON.stringify(oldDay.vertretungen);

                    // NOTE: There IS a bug, in which the current day just disappears for some
                    // reason for a short time from the plan, we do not want to do the processing
                    // in such a circumstance. So we check against our old plan and if the current
                    // day has disappeard but existed BEFORE we can expect that that bug has occured
                    // and thus just prevent all this stuff from running (which would otherwise
                    // trigger two notifications in short distance what we really do not want)

                    // TD;DR: This checks if today was present on last plan but is not on this and
                    // if that should be true it cancels the whole thing due to this being a bug

                    // calling getDay on the UTC timezone shouldn't be a problem as everything here does
                    // not run in the critical zone where it may be the next day in UTC time but not in MET
                    const now = new Date();
                    if (oldPlan && ![0, 6].includes(now.getUTCDay())) {
                        const days = [oldPlan, plan].map((plan) => plan.days.find((x) => daysOfWeek.indexOf(x.day_of_week) === now.getUTCDay()));
                        if (days[0] && !days[1]) return console.log(consoleTime() + `❌ Current day has disappeared for user ${i}`);
                    }

                    // We don't want to save that plan most likely
                    if (!plan.days.length) return console.log(consoleTime() + `❌ No days found for user ${i}`);

                    let text = null;
                    if (!oldPlan) text = plan.days.map(buildDay).join("\n");
                    else {
                        const daysFoundInOldPlan = plan.days.filter((day) => oldPlan.days.find((old) => old.date === day.date));
                        if (daysFoundInOldPlan.length !== plan.days.length) {
                            // We do not need to find it via date as it is the same due to daysFoundInOldPlan
                            // including the data from the new plan and we're using the new plan to compare
                            const newDays = plan.days.filter((day) => !daysFoundInOldPlan.includes(day));
                            const anySubstitutions = newDays.some((day) => day.vertretungen.length > 0);
                            if (anySubstitutions) text = plan.days.map(buildDay).join("\n");
                        } else {
                            const anyDayHasChanged = plan.days.some((day) => {
                                // So if there are no new substitutions in that day, there is no need
                                // to show that the user and would just be annoying, so we do not process
                                // it if it should be empty. Example: It is monday, there is one substitution
                                // on tuesday. Then it becomes tuesday and thus wednesday appears on the
                                // system. There are no substitutions on wednesday, nothing has changed on
                                // tuesday. If this check wouldn't exist, the notification would still be shown
                                if (!day.vertretungen.length) return false;
                                const partner = oldPlan.days.find((x) => x.day === day.day);
                                return !partner || dayHasChanged(day, partner);
                            });
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
                    // Useful for debugging when notifications were
                    // sent and when the client actually recieved them
                    const time = new Date();
                    await appendFile("./dispatches.log", `\n[${time.getDate()}.${time.getMonth() + 1}.${time.getFullYear()}] ${consoleTime()}`);
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
            await fetch(DATABASE_SHARD).catch(async (error) => {
                // We expect this request to time out, but not to do anything else
                if (error.cause?.code === "UND_ERR_CONNECT_TIMEOUT") return;
                console.log(consoleTime() + "Killing process");
                const time = new Date();
                await appendFile("./crashes.log", `\n[${time.getDate()}.${time.getMonth() + 1}.${time.getFullYear()}] ${consoleTime()}`);
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
