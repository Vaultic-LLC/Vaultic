import { environment } from "../Environment";
import { LogResponse } from "../Types/Responses";
import { AxiosHelper } from "./AxiosHelper";

export interface AppController
{
    log: (exception: string, stack: string) => Promise<LogResponse>;
}

export function createAppController(axiosHelper: AxiosHelper): AppController
{
    async function log(exception: string, stack: string)
    {
        await environment.repositories.logs.log(undefined, exception, stack);
        return axiosHelper.api.post('App/ReportError', {
            Exception: exception,
            Stack: stack
        });
    }

    return {
        log
    }
}
