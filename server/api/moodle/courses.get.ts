import { RateLimitAcceptance, handleRateLimit } from "../../ratelimit";
import { APIError, generateDefaultHeaders, patterns, setErrorResponse, STATIC_STRINGS } from "../../utils";
import { generateMoodleURL, lookupSchoolMoodle, transformMoodleCourse } from "../../moodle";
import { SchemaEntryConsumer, validateQueryNew } from "~/server/validator";
import { MoodleCourse } from "~/common/moodle";

const querySchema: SchemaEntryConsumer = {
    session: { required: true, size: 10, pattern: patterns.MOODLE_SESSION },
    cookie: { required: true, size: 26, pattern: patterns.MOODLE_COOKIE },
    school: { required: true, type: "number", min: 1, max: 9999 }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = getRequestIP(event, { xForwardedFor: true });

    const query = getQuery<{ [key: string]: string }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponse(res, 400, queryValidation);

    const rateLimit = handleRateLimit("/api/moodle/courses.get", address);
    if (rateLimit !== RateLimitAcceptance.Allowed) return setErrorResponse(res, rateLimit === RateLimitAcceptance.Rejected ? 429 : 403);

    const { session, cookie, school } = query;

    try {
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponse(res, 404, STATIC_STRINGS.MOODLE_SCHOOL_NOT_EXIST);

        const response = await fetch(`${generateMoodleURL(school)}/lib/ajax/service.php?sesskey=${session}`, {
            method: "POST",
            headers: {
                Cookie: `MoodleSession=${cookie}`,
                "Content-Type": "application/json",
                ...generateDefaultHeaders(address)
            },
            body: JSON.stringify([
                {
                    index: 0,
                    methodname: "core_course_get_enrolled_courses_by_timeline_classification",
                    args: {
                        classification: "all",
                        limit: 0,
                        offset: 0,
                        sort: "ul.timeaccess desc"
                    }
                }
            ])
        });

        const json = await response.json();
        if (!json[0].error) {
            const { courses } = json[0].data;
            if (!courses) throw new APIError("Courses property not present even though there is no error", false);
            return { error: false, courses: courses.map((course: MoodleCourse) => transformMoodleCourse(course)) };
        }

        return setErrorResponse(res, 401);
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
