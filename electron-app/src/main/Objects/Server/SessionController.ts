import { ValidateEmailResponse, CreateAccountResponse, BaseResponse, ValidateUserResponse } from "../../Types/Responses";
import { AxiosHelper } from "../../Types/ServerTypes";

export interface SessionController
{
	validateEmail: (email: string) => Promise<ValidateEmailResponse>;
	createAccount: (data: string) => Promise<CreateAccountResponse>;
	validateEmailAndMasterKey: (email: string, key: string) => Promise<ValidateUserResponse>;
	expire: () => Promise<BaseResponse>;
}

export function createSessionController(axiosHelper: AxiosHelper)
{
	function validateEmail(email: string): Promise<ValidateEmailResponse>
	{
		return axiosHelper.postSTS('Session/ValidateEmail', {
			Email: email,
		});
	}

	function createAccount(data: string): Promise<CreateAccountResponse>
	{
		return axiosHelper.postSTS('Session/CreateAccount', data);
	}

	function validateEmailAndMasterKey(email: string, key: string): Promise<ValidateUserResponse>
	{
		return axiosHelper.postSTS('Session/ValidateEmailAndMasterKey', {
			Email: email,
			MasterKey: key,
		});
	}

	function expire(): Promise<BaseResponse>
	{
		return axiosHelper.postAPI('Session/Expire', {});
	}

	return {
		validateEmail,
		createAccount,
		validateEmailAndMasterKey,
		expire,
	}
}
