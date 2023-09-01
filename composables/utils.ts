export const useWait = async (ms: number) => {

    return await new Promise((resolve) => setTimeout(resolve, ms));

}