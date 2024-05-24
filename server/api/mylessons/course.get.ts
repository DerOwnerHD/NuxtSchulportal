import { RateLimitAcceptance, handleRateLimit } from "../../ratelimit";
import {
    BasicResponse,
    Nullable,
    generateDefaultHeaders,
    hasInvalidAuthentication,
    hasPasswordResetLocationSet,
    patterns,
    removeBreaks,
    schoolFromRequest,
    setErrorResponse,
    transformEndpointSchema,
    validateQuery
} from "../../utils";
import { JSDOM } from "jsdom";
import cryptoJS from "crypto-js";
import { COURSE_UNAVAILABLE_ERROR, MyLessonsLesson } from "~/server/mylessons";
import { hasInvalidSidRedirect } from "~/server/failsafe";

const schema = {
    query: {
        token: { required: true, pattern: patterns.SID },
        session: { required: true, pattern: patterns.SESSION_OR_AUTOLOGIN },
        key: { required: false, pattern: patterns.AES_PASSWORD },
        semester: { required: false, type: "number", min: 1, max: 2 },
        id: { required: true, type: "number", min: 1, max: 999_999 }
    }
};

interface Course extends BasicResponse {
    lessons: MyLessonsLesson[];
    attendance: { [key: string]: Nullable<string> };
}

export default defineEventHandler<Promise<Course>>(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const query = getQuery<{ token: string; session: string; key?: string; semester?: string; id: string }>(event);
    if (!validateQuery(query, schema.query)) return setErrorResponse(res, 400, transformEndpointSchema(schema));

    const rateLimit = handleRateLimit("/api/mylessons/course.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { token, session, key, semester, id } = query;

    try {
        const response = await fetch(`https://start.schulportal.hessen.de/meinunterricht.php?a=sus_view&id=${id}&halb=${semester}`, {
            headers: {
                Cookie: `sid=${token}; SPH-Session=${session}; ${schoolFromRequest(event)}`,
                ...generateDefaultHeaders(address)
            },
            redirect: "manual",
            method: "GET"
        });

        if (hasInvalidSidRedirect(response)) return setErrorResponse(res, 403, "Route gesperrt");
        if (hasInvalidAuthentication(response)) return setErrorResponse(res, 401);
        if (hasPasswordResetLocationSet(response)) return setErrorResponse(res, 418, "Lege dein Passwort fest");

        const html = removeBreaks(await response.text());
        if (html.includes(COURSE_UNAVAILABLE_ERROR)) return setErrorResponse(res, 403, "Class not available for user");

        const {
            window: { document }
        } = new JSDOM(html);

        const lessonElements = Array.from(document.querySelectorAll(".tab-pane#history table.table tbody tr"));
        const lessons = [];
        for (const lesson of lessonElements) {
            // @ts-ignore it does not matter what we push into parseInt
            const entry = parseInt(lesson.getAttribute("data-entry")) || null;

            const firstRowItems = lesson
                .querySelector("td:first-child")
                ?.textContent?.split("   ")
                .map((line) => line.trim());
            // We'd expect the content to be seperated by a big empty space
            // (the first part containing the date and then the lessons)
            if (firstRowItems?.length !== 2) continue;
            // This reverses our date from 23.09.2024 to 2024-09-23
            // so the Date constructor can actually parse it
            const date = firstRowItems[0].split(".").reverse().join("-");
            const lessonsOfLesson = firstRowItems[1].split(" - ").map((lesson) => parseInt(lesson.replace(/\.( )?(Stunde)?/gi, "")));

            const topic = lesson.querySelector("td:nth-child(2) > big b")?.innerHTML.trim() ?? null;
            const hasHomework = lesson.querySelector("span.homework") !== null;
            const homework = hasHomework
                ? {
                      // Depending on whether the homework is done, the done or undone
                      // texts get hidden (so if it's done, the undone class is hidden, if not reversed)
                      done: lesson.querySelector("span.homework .done:not(.hidden)") !== null,
                      // We do want to remove an extra <br> at the beginning and the end of
                      // the description, they seem to be always added on top
                      // Just as well, every other <br> includes a white space just after it,
                      // so we also purge all that stuff, as it is not removed by String.trim()
                      description: lesson
                          .querySelector("td:nth-child(2) span.markup")
                          ?.innerHTML.replace(/(^<br>)|(<br>$)/, "")
                          .replace(/<br> /g, "<br>")
                          .trim()
                  }
                : null;

            const downloadBox = lesson.querySelector("td:nth-child(2) .alert.alert-info");
            const downloads =
                downloadBox !== null
                    ? {
                          // This is the download link to all the files as a zip file
                          link: downloadBox.querySelector("a.btn.btn-default")?.getAttribute("href") || null,
                          files: Array.from(downloadBox.querySelectorAll(".files .file")).map((file) => {
                              return {
                                  // The path for downloading that file would be as follows:
                                  // https://start.schulportal.hessen.de/meinunterricht.php?a=downloadFile&id=<course>&e=<lesson>&f=<file name>
                                  extension: file.getAttribute("data-extension") || null,
                                  name: file.getAttribute("data-file") || null,
                                  size: file.querySelector("a small")?.innerHTML.replace(/\(|\)/g, "") || null
                              };
                          })
                      }
                    : { link: null, files: [] };

            const uploads = Array.from(lesson.querySelectorAll("td:nth-child(2) .btn-group")).map((uploadElement) => {
                const button = uploadElement.querySelector("button");
                const dropdown = uploadElement.querySelector("ul.dropdown-menu");
                if (button === null || dropdown === null) return { count: null, name: null, files: null, uploadable: false };
                // 3 represents Node.TEXT_NODE, which is not existent given in this enviroment
                const name = Array.from(button.childNodes)
                    .filter((element) => element.nodeType === 3)
                    .map((element) => element.textContent)
                    .join("")
                    .trim();
                const uploadable = dropdown.querySelector("li:first-child a")?.textContent?.trim() !== "Abgeben aktuell nicht möglich";
                const link = dropdown.querySelector("li:first-child a")?.getAttribute("href") ?? null;
                const files = Array.from(dropdown.querySelectorAll("li:nth-child(1n+3) a")).map((file) => {
                    return { link: file.getAttribute("href") || null, name: file.textContent?.trim() };
                });
                return { name, uploadable, link, files };
            });

            const encodedAttendance = lesson.querySelector("td:nth-child(3) encoded")?.innerHTML ?? "";
            const attendance =
                typeof key === "string"
                    ? removeBreaks(
                          cryptoJS.AES.decrypt(encodedAttendance, key)
                              .toString(cryptoJS.enc.Utf8)
                              .replace(/<div class="hidden hidden_encoded">[a-f0-9]{32}<\/div>|<(\/)?[^>]*>/g, "")
                      ).trim()
                    : null;

            lessons.push({ entry, lessons: lessonsOfLesson, date, topic, homework, downloads, uploads, attendance });
        }

        const attendance: { [key: string]: number | null } = {};
        typeof key === "string"
            ? Array.from(document.querySelectorAll(".tab-pane#attendanceTable table.table tbody tr")).map((element) => {
                  const [name, count] = Array.from(element.querySelectorAll("td encoded")).map((element) =>
                      removeBreaks(
                          cryptoJS.AES.decrypt(element.innerHTML, key)
                              .toString(cryptoJS.enc.Utf8)
                              .replace(/<div class="hidden hidden_encoded">[a-f0-9]{32}<\/div>/, "")
                              .trim()
                      )
                  );
                  return (attendance[name] = parseInt(count) || null);
              })
            : null;

        return { error: false, lessons, attendance };
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
