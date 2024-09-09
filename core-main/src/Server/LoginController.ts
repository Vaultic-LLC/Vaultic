import { FinishLoginResponse, StartLoginResponse } from "../Types/Responses";
import { AxiosHelper } from "./AxiosHelper";

export interface LoginController
{
    start: (startClientLoginRequest: string, email: string) => Promise<StartLoginResponse>;
    finish: (token: string, finishClientLoginRequest: string, userDataPayload: any) => Promise<FinishLoginResponse>;
}

export function createLoginController(axiosHelper: AxiosHelper)
{
    function start(startClientLoginRequest: string, email: string): Promise<StartLoginResponse>
    {
        return axiosHelper.sts.post('Login/Start', {
            StartClientLoginRequest: startClientLoginRequest,
            Email: email
        });
    }

    function finish(token: string, finishClientLoginRequest: string, userDataPayload: any): Promise<FinishLoginResponse>
    {
        return axiosHelper.sts.post('Login/Finish', {
            Token: token,
            FinishClientLoginRequest: finishClientLoginRequest,
            UserDataPayload: userDataPayload
        });
    }

    return {
        start,
        finish
    }
}
