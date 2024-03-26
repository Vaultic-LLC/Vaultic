import { ValidateEmailResponse, CreateAccountResponse, BaseResponse, ValidateUserResponse } from "../../Types/Responses";
import { AxiosHelper } from "./AxiosHelper";

export interface SessionController
{
	validateEmail: (email: string) => Promise<ValidateEmailResponse>;
	createAccount: (data: string) => Promise<CreateAccountResponse>;
	validateEmailAndMasterKey: (email: string, key: string) => Promise<ValidateUserResponse>;
	validateEmailMasterKeyAndReAddVaulticAccount(data: string): Promise<ValidateUserResponse>;
	expire: () => Promise<BaseResponse>;
}

export function createSessionController(axiosHelper: AxiosHelper)
{
	function validateEmail(email: string): Promise<ValidateEmailResponse>
	{
		return axiosHelper.post('Session/ValidateEmail', {
			Email: email,
		});
	}

	function createAccount(data: string): Promise<CreateAccountResponse>
	{
		return axiosHelper.post('Session/CreateAccount', data);
	}

	function validateEmailAndMasterKey(email: string, key: string): Promise<ValidateUserResponse>
	{
		return axiosHelper.post('Session/ValidateEmailAndMasterKey', {
			Email: email,
			MasterKey: key,
		});
	}

	function validateEmailMasterKeyAndReAddVaulticAccount(data: string): Promise<ValidateUserResponse>
	{
		return axiosHelper.post('Session/ValidateEmailMasterKeyAndReAddVaulticAccount', data);
	}

	function expire(): Promise<BaseResponse>
	{
		return axiosHelper.post('Session/Expire', {});
	}

	return {
		validateEmail,
		createAccount,
		validateEmailAndMasterKey,
		validateEmailMasterKeyAndReAddVaulticAccount,
		expire,
	}
}
