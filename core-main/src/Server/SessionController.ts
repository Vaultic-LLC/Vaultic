import { BaseResponse } from "../Types/Responses";
import { AxiosHelper } from "./AxiosHelper";

export interface SessionController
{
    expire: () => Promise<BaseResponse>;
}

export function createSessionController(axiosHelper: AxiosHelper)
{
    function expire(): Promise<BaseResponse>
    {
        return axiosHelper.api.post('Session/Expire', {});
    }

    return {
        expire
    }
}
