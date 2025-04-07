import { StartRegistrationResponse, FinishRegistrationResponse } from "@vaultic/shared/Types/Responses";
import { AxiosHelper } from "./AxiosHelper";

export interface RegistrationController
{
    start: (startClientRegistrationRequest: string, pendingUserToken: string) => Promise<StartRegistrationResponse>;
    finish: (token: string, finishClientRegistrationRecord: string, firstName: string, lastName: string) => Promise<FinishRegistrationResponse>;
}

export function createRegistrationController(axiosHelper: AxiosHelper)
{
    function start(startClientRegistrationRequest: string, pendingUserToken: string): Promise<StartRegistrationResponse>
    {
        return axiosHelper.sts.post('Register/Start', {
            StartClientRegistrationRequest: startClientRegistrationRequest,
            Token: pendingUserToken
        });
    }

    function finish(token: string, finishClientRegistrationRecord: string, firstName: string, lastName: string): Promise<FinishRegistrationResponse>
    {
        return axiosHelper.sts.post('Register/Finish', {
            Token: token,
            FinishClientRegistrationRecord: finishClientRegistrationRecord,
            FirstName: firstName,
            LastName: lastName
        });
    }

    return {
        start,
        finish
    }
}
