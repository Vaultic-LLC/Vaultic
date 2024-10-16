import { environment } from "../Environment";
import { AxiosHelper } from "./AxiosHelper";
import { AppController } from "@vaultic/shared/Types/Controllers";

export function createAppController(axiosHelper: AxiosHelper): AppController
{
    async function log(exception: string, stack: string)
    {
        await environment.repositories?.logs?.log?.(undefined, exception, stack);
        return axiosHelper.api.post('App/ReportError', {
            Exception: exception,
            Stack: stack
        });
    }

    return {
        log
    }
}
