import { StartRegistrationResponse } from "../Types/Responses";
import { AxiosHelper } from "./AxiosHelper";

export interface RegistrationController
{
    start: (startClientRegistrationRequest: string, email: string) => Promise<StartRegistrationResponse>;
    finish: (token: string, finishClientRegistrationRecord: string,
        firstName: string, lastName: string) => Promise<any>;
}

export function createRegistrationController(axiosHelper: AxiosHelper)
{
    function start(startClientRegistrationRequest: string, email: string): Promise<StartRegistrationResponse>
    {
        return axiosHelper.sts.post('Register/Start', {
            StartClientRegistrationRequest: startClientRegistrationRequest,
            Email: email
        });
    }

    function finish(token: string, finishClientRegistrationRecord: string,
        firstName: string, lastName: string): Promise<any>
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
