let alreadyAttemptedFetch = false;
export async function loadSurnamesFromLerngruppen() {
    // Why bother redoing that good stuff?
    if (Array.isArray(useSurnames().value)) return;
    const lerngruppen = useLerngruppen().value;
    if (!Array.isArray(lerngruppen)) {
        if (alreadyAttemptedFetch) return;
        alreadyAttemptedFetch = true;
        console.error("Lerngruppen not yet fetched. Fetchin' them real quick...");
        await useLerngruppenFetch();
        return loadSurnamesFromLerngruppen();
    }
    // The full name format would be for example "Mustermann-Karlsen, Max Dieter (MUS)"
    const teachers: { firstname: string; surname: string; short: string; full: string }[] = [];
    for (const group of lerngruppen) {
        const { name } = group.teacher;
        if (!patterns.TEACHER_NAME_FULL_STRING.test(name)) continue;
        const alreadyFoundTeacher = teachers.findIndex((x) => x.full === name) !== -1;
        if (alreadyFoundTeacher) continue;
        const [surname, combination] = name.split(", ");
        // We just map them things to remove the last ) from the short form
        // Also the first thing needs some trimming at the end
        const [firstname, short] = combination.split("(").map((x) => x.replace(")", "").trim());
        teachers.push({ firstname, surname, short, full: name });
    }
    useSurnames().value = teachers;
}

interface Surname {
    firstname: string;
    surname: string;
    short: string;
    full: string;
}
export const useSurnames = () => useState<Surname[]>("surnames");

export const getNameDataFromProperty = (property: "full" | "short", value: string) => {
    if (!Array.isArray(useSurnames().value)) return null;
    const data = useSurnames().value.find((x) => x[property] === value);
    return data ?? null;
};
