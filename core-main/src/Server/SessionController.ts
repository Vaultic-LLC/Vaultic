import { BaseResponse } from "@vaultic/shared/Types/Responses";
import { AxiosHelper } from "./AxiosHelper";

export function createSessionController(axiosHelper: AxiosHelper)
{
    function expire(): Promise<BaseResponse>
    {
        return axiosHelper.api.post('Session/Expire');
    }

    function extend(): Promise<BaseResponse>
    {
        return axiosHelper.api.post('Session/Extend');
    }

    return {
        expire,
        extend
    }
}
