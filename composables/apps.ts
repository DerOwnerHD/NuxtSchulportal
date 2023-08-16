interface VPlanDay {
    date: string;
    day_of_week: string;
    relative: "heute" | "morgen" | "";
    vertretungen: [];
    news: string[];
}

interface VertretungenResponse {
    error: boolean;
    days: VPlanDay[];
    last_updated: string;
}

enum APIFetchError {
    Unauthorized,
    TooManyRequests,
    ServerError
}

/**
 * Fetches the data of the Vertretungsplan from the API
 * @returns A list of all the days listed on the plan or null - which would indicate that the client should reauthenticate
 */
export const useVplan = async (): Promise<{ last_updated: string; days: VPlanDay[] } | APIFetchError> => {
    const token = useToken().value;
    if (!token) return APIFetchError.Unauthorized;

    const { data, error: fetchError } = await useFetch<VertretungenResponse>("/api/vertretungen", {
        method: "GET",
        headers: { Authorization: token }
    });

    // These could either be 401's, 429's or some other internal error
    if (fetchError.value !== null) {
        if (fetchError.value.status === 401) return APIFetchError.Unauthorized;

        if (fetchError.value.status === 429) return APIFetchError.TooManyRequests;

        return APIFetchError.ServerError;
    }

    if (data.value === null) return APIFetchError.ServerError;

    const { error, ...plan } = data.value;

    return plan;
};
