import { generateDefaultHeaders, patterns, setErrorResponse, transformEndpointSchema, validateQuery } from "../../utils";
import { generateMoodleURL, lookupSchoolMoodle } from "../../moodle";

const schema = {
    query: {
        cookie: { required: true, length: 26, pattern: patterns.MOODLE_COOKIE },
        school: { required: true, type: "number", min: 1, max: 9999 },
        path: {
            required: true,
            min: 1,
            max: 100,
            pattern: /^\/(theme\/image\.php\/sph\/core\/\d{1,20}\/)|(pluginfile.php\/\d{1,10}\/.{1,100}).{1,50}$/
        }
    }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const query = getQuery<{ [key: string]: string }>(event);
    if (!validateQuery(query, schema.query)) return setErrorResponse(res, 400, transformEndpointSchema(schema));

    const { cookie, school, path } = query;

    try {
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponse(res, 404, "Moodle doesn't exist for given school");

        const response = await fetch(`${generateMoodleURL(school)}${path}`, {
            method: "GET",
            headers: {
                Cookie: `MoodleSession=${cookie}`,
                ...generateDefaultHeaders(address)
            }
        });

        res.setHeader("Content-Type", response.headers.get("Content-Type") || "image/png");
        return await response.blob();
    } catch (error) {
        console.error(error);
        return setErrorResponse(res, 500);
    }
});
