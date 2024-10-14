import type { StundenplanDay, Stundenplan, StundenplanClass, StundenplanLesson } from "~/common/stundenplan";

export const useStundenplan = () => useState<Stundenplan[]>("stundenplan", () => []);
export function convertStundenplanTimeFormat(input: number[][]) {
    return input.map((time) => time.map(addZeroToNumber).join(":")).join(" - ");
}

export function formatLessonArray(lessons: number[], dots: string = ".", spacing: string = " ") {
    if (lessons.length === 0) return "";
    if (lessons.length === 1) return lessons[0] + dots;
    return `${lessons.at(0)}${dots}${spacing}-${spacing}${lessons.at(-1)}${dots}`;
}

export async function fetchStundenplan() {
    clearAppError(AppID.Stundenplan);
    clearNotifications(AppID.Stundenplan);
    // @ts-ignore
    useStundenplan().value = null;
    try {
        const response = await $fetch("/api/stundenplan", {
            query: {
                token: useToken().value,
                school: school.value
            }
        });
        useStundenplan().value = response.plans;
        useNotifications().value.set(AppID.Stundenplan, response.plans.length - 1);
        const announcement = checkForUnannouncedPlan();
        if (announcement !== null) useSplanAnnouncement().value = announcement;
    } catch (error) {
        useReauthenticate(error);
        setNotificationCount(AppID.Stundenplan, -1);
        createAppError(AppID.Stundenplan, error, fetchStundenplan);
    }
}

export const useSplanAnnouncement = () =>
    useState<{ announced: boolean; days: StringifiedPlanComparison[]; start_date: string }>("splan-announcement");

const ANNOUNCEMENT_DAY_THRESHOLD = 7;
function checkForUnannouncedPlan() {
    const plans = useStundenplan();
    if (!plans.value) {
        console.warn("splan.checkForUnannouncedPlan was called before plans were even loaded");
        return null;
    }
    if (!plans.value.length) return null;
    const cache = localStorage.getItem("splan-cache");
    // If there is no plan stored so far, there obviously is nothing to compare to
    if (cache === null) {
        writePlanToCache();
        return null;
    }
    let data: SplanCache;
    try {
        data = JSON.parse(cache);
        // This is some validation in case something might have changed from where the user has it stored
        // If any of that should happen, we want to wipe the data stored - to allow the user to continue
        if (typeof data.id !== "string" || !Array.isArray(data.days) || !Array.isArray(data.lessons) || !Array.isArray(data.others))
            throw new Error();
    } catch (error) {
        console.error("Error while reading splan cache", error);
        localStorage.removeItem("splan-cache");
        return null;
    }
    const currentPlan = plans.value.find((plan) => plan.current);
    if (!currentPlan) {
        // Should be impossible, unless we are on holidays perhaps
        // If that is the case, we don't write anything to the cache
        console.warn("No splan has the attribute current set to true");
        return null;
    }
    const hasSameCurrentPlan = currentPlan.start_date === data.id;
    // Even though they might still start on the same day, there might be
    // differences between the plans. This comparison might be inefficient
    // but shouldn't be THAT troublesome as that thing isn't that big.
    // Looping through everything might be much more expensive
    const plansContainSameData = JSON.stringify(currentPlan.days) === JSON.stringify(data.days);
    // We really do not care for what might be in the other plans still upcoming
    if (hasSameCurrentPlan && plansContainSameData) {
        writePlanToCache();
        return null;
    }
    // If the plan is older than some time (a week), then we can expect the user
    // to already know about that plan change. They might not have visited the site
    // in a week or may have not dismissed the popup in that time.
    const testDate = new Date();
    testDate.setDate(testDate.getDate() - ANNOUNCEMENT_DAY_THRESHOLD);
    const planIsOld = new Date(currentPlan.start_date).getTime() < testDate.getTime();
    if (planIsOld) {
        writePlanToCache();
        return null;
    }
    // The new plan may have been listed for a longer time, thus it is not
    // an "unannounced" change, but we still want to alert the user (if they hadn't seen before)
    const newPlanWasInList = data.others.includes(currentPlan.start_date);
    // @ts-ignore for the first argument we provide a object just containing days, which does not
    // fit the Stundenplan type but fits the function due to it only needing that
    const comparison = comparePlans("", [{ days: data.days, lessons: data.lessons }, currentPlan]);
    if (comparison === null) {
        writePlanToCache();
        return null;
    }

    // Up to this point, we've always overwritten our currently stored cache -
    // we would never had actually written anything to the user. But after this
    // we require acknoledgement from the user to ever dismiss the popup
    const differences = reducePlanComparison(comparison);
    if (differences.length === 0) {
        writePlanToCache();
        return null;
    }
    return { announced: newPlanWasInList, days: differences, start_date: currentPlan.start_date };
}

interface SplanCache {
    id: string;
    days: StundenplanDay[];
    lessons: number[][][];
    // The start_date properties of all other plans
    others: string[];
}

interface StundenplanComparison {
    differences: {
        type: "default" | "added" | "removed";
        lessons: number[];
        subjects: StundenplanSubjectComparison[];
    }[][];
    lessons: number[][][];
}

function stringifySubjects(subjects: StundenplanSubjectComparison[], show_unchanged: boolean = false) {
    return subjects
        .map((subject) => {
            const {
                data: { room, teacher, name },
                updates,
                type
            } = subject;
            switch (type) {
                case "new":
                    return `${name} bei ${teacher} in ${room} hinzugefügt`;
                case "removed":
                    return `${name} entfernt`;
                case "updated": {
                    if (!updates) {
                        console.warn("Defined a subject as updated in splan comparison even though nothing changed");
                        // Returns null below (or the unchanged thingy)
                        break;
                    }
                    const teacherString = " bei " + (updates.has("teacher") ? updates.get("teacher")!.join(", vorher ") : teacher);
                    const roomString = " in " + (updates.has("room") ? updates.get("room")!.join(", vorher ") : room);
                    return name + teacherString + roomString;
                }
            }
            return show_unchanged ? `${name} bei ${teacher} in ${room}` : null;
        })
        .filter((x) => x !== null);
}

interface StringifiedPlanComparison {
    day: string;
    differences: StringifiedPlanComparisonLesson[];
}

interface StringifiedPlanComparisonLesson {
    type: "default" | "added" | "removed";
    lessons: number[];
    subjects: StundenplanSubjectComparison[];
}

function reducePlanComparison(comparison: StundenplanComparison) {
    return comparison.differences
        .map((day, index) => {
            const differences = day
                .map((lesson) => {
                    const { type, lessons, subjects } = lesson;
                    // If the lesson has been added or removed, the subjects are all marked as unchanged
                    // - see largestSharedLesson loop
                    const areSubjectsMarkedUnchanged = ["added", "removed"].includes(type);
                    const filteredSubjects = subjects.filter((subject) => subject.type !== "unchanged");
                    if (!areSubjectsMarkedUnchanged && !filteredSubjects.length) return null;
                    return {
                        type,
                        lessons,
                        subjects: filteredSubjects
                    };
                })
                .filter((x) => x !== null);
            const anyLessonsUpdated = differences.some(({ type }) => ["added", "removed"].includes(type));
            const anySubjectsUpdated = differences.some(({ subjects }) => subjects.length > 0);
            if (!anyLessonsUpdated && !anySubjectsUpdated) return null;
            return { day: WEEKDAYS.full[index], differences };
        })
        .filter((x) => x !== null);
}

function writePlanToCache() {
    const plans = useStundenplan();
    if (!plans.value) return console.warn("Cannot call writePlanToCache without a plan set");
    // THIS SHOULD NEVER BE CALLED WHEN WE HAVE NO PLANS
    if (!plans.value.length) return;
    const currentPlan = plans.value[0];
    if (!currentPlan.current) console.warn("splan at index 0 is not current plan - should be impossible");
    const otherPlans = plans.value.slice(1).map((plan) => plan.start_date);
    localStorage.setItem(
        "splan-cache",
        JSON.stringify({
            id: currentPlan.start_date,
            days: currentPlan.days,
            lessons: currentPlan.lessons,
            others: otherPlans
        })
    );
}

export function markSplanAnnouncementAsRead() {
    writePlanToCache();
    // @ts-ignore
    useSplanAnnouncement().value = null;
}

export function comparePlans(id: string, plansOverwrite?: Stundenplan[]) {
    const isOverwritingPlans = Array.isArray(plansOverwrite);
    const stundenplan = useStundenplan();
    if (!stundenplan.value && !isOverwritingPlans) return null;
    if (isOverwritingPlans && plansOverwrite.length < 2) {
        console.error("If ya' really want to compare two directly provided plans, at least gimme them correctly");
        return null;
    }
    const basePlan = stundenplan.value.find((plan) => plan.current);
    const plan = stundenplan.value.find((plan) => plan.start_date === id);
    // We need a base plan to compare to
    if (!isOverwritingPlans && (!plan || !basePlan)) return null;
    // @ts-ignore TS does not understand our check above
    const baseDays = splitAllLessons(isOverwritingPlans ? plansOverwrite[0] : basePlan);
    // @ts-ignore
    const days = splitAllLessons(isOverwritingPlans ? plansOverwrite[1] : plan);
    const differences = days.map((day, index) => {
        const baseDay = baseDays[index];
        const differences: {
            type: "default" | "added" | "removed";
            lessons: number[];
            subjects: StundenplanSubjectComparison[];
        }[] = [];
        const hasMoreLessons = day.length > baseDay.length;
        const largestSharedLesson = Math.min(day.length, baseDay.length);
        const largestTotalLesson = Math.max(day.length, baseDay.length);
        // Here we look for all the lessons both have in common
        // and then find subject differences. If one subject is entirely
        // missing, it's regarded as new, and changes are as updated
        for (let j = 0; j < largestSharedLesson; j++) {
            const lesson = day[j];
            const baseLesson = baseDay[j];

            const subjects: StundenplanSubjectComparison[] = lesson.classes.map((subject) => {
                const subjectInBase = baseLesson.classes.find((x) => x.name === subject.name);
                if (!subjectInBase) return { type: "new", data: subject };
                const updates: Map<StundenplanSubjectUpdate, string[]> = new Map();
                if (subject.room !== subjectInBase.room) updates.set("room", [subject.room, subjectInBase.room]);
                if (subject.teacher !== subjectInBase.teacher) updates.set("teacher", [subject.teacher, subjectInBase.teacher]);
                return { type: updates.size > 0 ? "updated" : "unchanged", data: subject, updates };
            });

            // Removed lessons are only found by running through the base plan
            // and finding lessons there which do not exist on the selected plan
            const removedSubjects = baseLesson.classes
                .map((subject) => {
                    const isSubjectInPlan = lesson.classes.find((x) => x.name === subject.name);
                    return !isSubjectInPlan ? { type: "removed", data: subject } : null;
                })
                .filter((x) => x !== null);

            differences.push({ type: "default", subjects: subjects.concat(removedSubjects as StundenplanSubjectComparison[]), lessons: [j + 1] });
        }

        const largerPlan = hasMoreLessons ? day : baseDay;
        // If both are the exact same size, nothing in this loop will ever happen
        for (let j = largestSharedLesson + 1; j <= largestTotalLesson; j++) {
            differences.push({
                type: hasMoreLessons ? "added" : "removed",
                subjects: largerPlan[j - 1].classes.map((subject) => {
                    // We mark this all these as unchanged as we would not want
                    // them to be highlighted as well as the lesson as a whole
                    // (and there ain't nothing to compare to)
                    return { type: "unchanged", data: subject };
                }),
                lessons: [j + 1]
            });
        }

        // As we have previously split all lessons (splitAllLessons), we now
        // once again merge those with the same data together (if they have the
        // same subjects in them)
        const combined = differences
            .toReversed()
            .map((entry, index) => {
                const actualIndex = differences.length - index - 1;
                const skipOverLesson = (() => {
                    if (actualIndex === 0) return false;
                    const previous = differences[actualIndex - 1];
                    if (previous.type !== entry.type) return false;
                    const subjects = [entry, previous].map((x) => JSON.stringify(x.subjects));
                    return subjects[0] === subjects[1];
                })();
                if (skipOverLesson) {
                    differences[actualIndex - 1].lessons = [...differences[actualIndex - 1].lessons, ...entry.lessons];
                    return null;
                }
                return entry;
            })
            .toReversed()
            .filter((x) => x !== null);
        return combined;
    });

    if (isOverwritingPlans)
        return {
            differences,
            lessons: plansOverwrite[0].lessons.length > plansOverwrite[1].lessons.length ? plansOverwrite[0].lessons : plansOverwrite[1].lessons
        };

    // @ts-ignore TS, please - if we are not overwriting plans, both of these are set
    return { differences, lessons: basePlan.lessons.length > plan.lessons.length ? basePlan.lessons : plan.lessons };
}

interface StundenplanSubjectComparison {
    type: "new" | "removed" | "updated" | "unchanged";
    data: StundenplanClass;
    /**
     * The first index is the compared plan and
     * the second index is the base plan
     *
     * [0] to <-- [1] from
     */
    updates?: Map<StundenplanSubjectUpdate, string[]>;
}

type StundenplanSubjectUpdate = "room" | "teacher";

/**
 * Splits up all combined lessons. Lessons are combined on the backend when they share the exact same classes.
 * For comparing plans, this is removed to prevent some issues.
 *
 * If, for example, a new plan only has a a subject
 * in the second hour, while previously, there had been something for hour 1 and 2, this would cause issues.
 * We can merge these later on again.
 * @param plan The plan for which to split lessons
 * @returns The list of split lessons for all days
 */
function splitAllLessons(plan: Stundenplan): StundenplanLesson[][] {
    return plan.days.map((day) =>
        day.lessons.flatMap((lesson) =>
            lesson.lessons.map((value) => {
                return {
                    classes: lesson.classes,
                    lessons: [value]
                };
            })
        )
    );
}

export const useStundenplanFlyout = computed<FlyoutGroups>(() => {
    const plans = useStundenplan();
    const errors = useAppErrors();
    const title = errors.value.has(AppID.Stundenplan)
        ? STATIC_STRINGS.LOADING_ERROR
        : plans.value
          ? plans.value.length
              ? `${plans.value.length} Stundenpl${plans.value.length > 1 ? "äne" : "an"} geladen`
              : "Keine Stundenpläne geladen"
          : // Due to the stundenplan useState being initialized using an array
            // (instead of being empty), this state will never be available
            STATIC_STRINGS.IS_LOADING;
    return [[{ title: "Stundenplan", text: title, action: () => navigateTo("/stundenplan") }], getStundenplanFlyoutItems()];
});

export function getStundenplanFlyoutItems() {
    const plans = useStundenplan();
    if (!Array.isArray(plans.value)) return [];
    return plans.value.map((plan) => ({
        title: `${convertDateStringToFormat(plan.start_date, "day-month-full", true)}${plan.current ? " (aktiv)" : ""}`,
        text: plan.end_date ? `Bis ${convertDateStringToFormat(plan.end_date, "day-month-full", true)}` : "",
        // Already being on /stundenplan would cause nothing to happen
        // Still, the parameter would be set and on a page reload, the user
        // would get thrown to that plan (if it even exists)
        action: () => navigateTo(`/stundenplan?plan=${plan.start_date}`)
    }));
}
