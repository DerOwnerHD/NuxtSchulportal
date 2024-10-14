import { RateLimitAcceptance, defineRateLimit, getRequestAddress } from "~/server/ratelimit";
import { BasicResponse, patterns, setErrorResponseEvent, STATIC_STRINGS } from "../../utils";
import { createMoodleRequest, getMoodleErrorResponseCode, lookupSchoolMoodle, transformMoodleCourse } from "../../moodle";
import { SchemaEntryConsumer, validateQueryNew } from "~/server/validator";
import { MoodleCourse, MoodleCoursesListClassification } from "~/common/moodle";
import { Course_EnrolledCoursesByTimelineClassification_ExternalFunction } from "~/server/moodle-external-functions";

const querySchema: SchemaEntryConsumer = {
    session: { required: true, size: 10, pattern: patterns.MOODLE_SESSION },
    cookie: { required: true, size: 26, pattern: patterns.MOODLE_COOKIE },
    school: { required: true, type: "number", min: 1, max: 9999 },
    classification: { required: false, pattern: /^(allincludinghidden|all|inprogress|future|past|favourites|hidden|customfield)$/ },
    sort: { required: false, pattern: /^(lastaccess|name)$/ }
};

interface Response extends BasicResponse {
    courses: MoodleCourse[];
}

const sortTransforms = {
    lastaccess: "ul.timeaccess desc",
    name: "fullname"
};

/**
 * See https://github.com/moodle/moodle/blob/67f5ee3cec6f1701bbbf1b6d57216a3d291e8802/course/externallib.php#L641
 * for the moodle API call. Response object fields are dependant on course permissions but our API assumes
 * client has no permission to view admin details.
 */

const rlHandler = defineRateLimit({ interval: 10, allowed_per_interval: 4 });
export default defineEventHandler<Promise<Response>>(async (event) => {
    const query = getQuery<{ session: string; cookie: string; school: string; classification?: string; sort?: "lastaccess" | "name" }>(event);
    const queryValidation = validateQueryNew(querySchema, query);
    if (queryValidation.violations > 0) return setErrorResponseEvent(event, 400, queryValidation);

    const rl = rlHandler(event);
    if (rl !== RateLimitAcceptance.Allowed) return setErrorResponseEvent(event, rl === RateLimitAcceptance.Rejected ? 429 : 403);
    const address = getRequestAddress(event);

    const { session, cookie, school, classification, sort } = query;

    try {
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponseEvent(event, 404, STATIC_STRINGS.MOODLE_SCHOOL_NOT_EXIST);

        const response = await createMoodleRequest<Course_EnrolledCoursesByTimelineClassification_ExternalFunction>(
            { school, cookie, session, address },
            {
                name: "core_course_get_enrolled_courses_by_timeline_classification",
                args: {
                    limit: 0,
                    offset: 0,
                    classification: classification as MoodleCoursesListClassification,
                    sort: sort ? sortTransforms[sort] : sortTransforms.lastaccess
                }
            }
        );

        const { error, error_details, data } = response[0];

        if (error) return setErrorResponseEvent(event, getMoodleErrorResponseCode(error_details), error_details);
        return { error: false, courses: data.courses.map(transformMoodleCourse) };
    } catch (error) {
        console.error(error);
        return setErrorResponseEvent(event, 500);
    }
});
