import type { Nullable } from "~/server/utils";

export interface StundenplanLesson {
    lessons: number[];
    classes: StundenplanClass[];
}

interface StundenplanClass {
    teacher: string;
    room: string;
    name: string;
}

export interface Stundenplan {
    days: StundenplanDay[];
    start_date: string;
    end_date: Nullable<string>;
    lessons: number[][][];
    current: boolean;
}

interface StundenplanDay {
    name: "Montag" | "Dienstag" | "Mittwoch" | "Donnerstag" | "Freitag";
    lessons: StundenplanLesson[];
}

export const useStundenplan = () => useState<Stundenplan[]>("stundenplan", () => []);
export function convertStundenplanTimeFormat(input: number[][]) {
    return input.map((time) => time.map(addZeroToNumber).join(":")).join(" - ");
}

export async function fetchStundenplan() {
    useAppErrors().value.delete(AppID.Stundenplan);
    useNotifications().value.delete(AppID.Stundenplan);
    // @ts-ignore
    useStundenplan().value = null;
    try {
        const response = await $fetch("/api/stundenplan", {
            query: {
                token: useToken().value,
                school: useSchool()
            }
        });
        useStundenplan().value = response.plans;
        useNotifications().value.set(AppID.Stundenplan, response.plans.length - 1);
    } catch (error) {
        useReauthenticate(error);
        useNotifications().value.set(AppID.Stundenplan, -1);
        // @ts-ignore
        useAppErrors().value.set(AppID.Stundenplan, error?.data?.error_details ?? error);
    }
}

export function comparePlans(id: string) {
    const stundenplan = useStundenplan();
    if (!stundenplan.value) return null;
    const basePlan = stundenplan.value.find((plan) => plan.current);
    const plan = stundenplan.value.find((plan) => plan.start_date === id);
    // We need a base plan to compare to
    if (!basePlan || !plan) return null;
    const baseDays = splitAllLessons(basePlan);
    const days = splitAllLessons(plan);
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

        console.log(differences);

        const largerPlan = hasMoreLessons ? day : baseDay;
        console.log(largestSharedLesson, largestTotalLesson);
        // If both are the exact same size, nothing in this loop will ever happen
        for (let j = largestSharedLesson + 1; j <= largestTotalLesson; j++) {
            console.log(j);
            differences.push({
                type: hasMoreLessons ? "added" : "removed",
                subjects: largerPlan[j - 1].classes.map((subject) => {
                    console.log(subject);
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
            .filter((x) => x !== null)
            .toReversed();

        return combined;
    });

    return { differences, lessons: basePlan.lessons.length > plan.lessons.length ? basePlan.lessons : plan.lessons };
}

interface StundenplanSubjectComparison {
    type: "new" | "removed" | "updated" | "unchanged";
    data: StundenplanClass;
    /**
     * The first index is the compared plan and
     * the second index is the base plan
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
