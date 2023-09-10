import { generateDefaultHeaders, patterns, setErrorResponse, transformEndpointSchema, validateQuery } from "../../utils";
import { lookupSchoolMoodle } from "../../moodle";

const schema = {
    query: {
        cookie: { required: true, length: 26, pattern: patterns.MOODLE_COOKIE },
        school: { required: true, type: "number", min: 1, max: 9999 },
        path: { required: true, min: 1, max: 100, pattern: /\/pluginfile.php\/\d{1,5}\/user\/icon\/sph\/.*/ }
    }
};

export default defineEventHandler(async (event) => {
    const { req, res } = event.node;
    const address = req.headersDistinct["x-forwarded-for"]?.join("; ");

    const query = getQuery(event);

    const valid = validateQuery(query, schema.query);
    if (!valid) return setErrorResponse(res, 400, transformEndpointSchema(schema));

    const { cookie, school, path } = query;

    try {
        const hasMoodle = await lookupSchoolMoodle(school);
        if (!hasMoodle) return setErrorResponse(res, 404, "Moodle doesn't exist for given school");

        const response = await fetch(`https://mo${school}.schule.hessen.de${path}`, {
            method: "GET",
            headers: {
                Cookie: `MoodleSession=${cookie?.toString()}`,
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