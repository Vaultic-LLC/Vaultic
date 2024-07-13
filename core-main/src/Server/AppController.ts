import { LogResponse } from "../Types/Responses";
import { AxiosHelper } from "./AxiosHelper";

export interface AppController
{
    log: (exception: string, stack: string) => Promise<LogResponse>;
}

export function createAppController(axiosHelper: AxiosHelper): AppController
{
    function log(exception: string, stack: string)
    {
        return axiosHelper.api.post('App/ReportError', {
            Exception: exception,
            Stack: stack
        });
    }

    return {
        log
    }
}
