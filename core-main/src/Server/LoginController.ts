import { FinishLoginResponse, StartLoginResponse } from "@vaultic/shared/Types/Responses";
import { AxiosHelper } from "./AxiosHelper";

export interface LoginController
{
    start: (startClientLoginRequest: string, email: string, mfaCode: string) => Promise<StartLoginResponse>;
    finish: (firstLogin: boolean, token: string, finishClientLoginRequest: string) => Promise<FinishLoginResponse>;
}

export function createLoginController(axiosHelper: AxiosHelper)
{
    function start(startClientLoginRequest: string, email: string, mfaCode: string): Promise<StartLoginResponse>
    {
        return axiosHelper.sts.post('Login/Start', {
            StartClientLoginRequest: startClientLoginRequest,
            Email: email,
            MFACode: mfaCode
        });
    }

    function finish(firstLogin: boolean, token: string, finishClientLoginRequest: string): Promise<FinishLoginResponse>
    {
        return axiosHelper.sts.post('Login/Finish', {
            FirstLogin: firstLogin,
            Token: token,
            FinishClientLoginRequest: finishClientLoginRequest
        });
    }

    return {
        start,
        finish
    }
}
