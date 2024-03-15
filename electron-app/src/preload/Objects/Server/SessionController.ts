import { ValidateEmailAndUsernameResponse, GenerateMFAResponse, CreateAccountResponse, ValidateUsernameAndPasswordResponse, ValidateMFACodeResponse, BaseResponse } from "../../Types/Responses";
import { AxiosHelper } from "./AxiosHelper";

export interface SessionController
{
	validateEmailAndUsername: (email: string, username: string) => Promise<ValidateEmailAndUsernameResponse>;
	generateMFA: () => Promise<GenerateMFAResponse>;
	createAccount: (firstName: string, lastName: string, email: string, username: string, password: string,
		mfaKey: string, mfaCode: string, createdTime: string) => Promise<CreateAccountResponse>;
	validateUsernameAndPassword: (username: string, password: string) => Promise<ValidateUsernameAndPasswordResponse>;
	validateMFACode: (username: string, password: string, mfaCode: string) => Promise<ValidateMFACodeResponse>;
	expire: () => Promise<BaseResponse>;
}

export function createSessionController(axiosHelper: AxiosHelper)
{
	function validateEmailAndUsername(email: string, username: string): Promise<ValidateEmailAndUsernameResponse>
	{
		return axiosHelper.post('Session/ValidateEmailAndUsername', {
			Email: email,
			Username: username
		});
	}

	function generateMFA(): Promise<GenerateMFAResponse>
	{
		return axiosHelper.get('Session/GenerateMFA');
	}

	function createAccount(firstName: string, lastName: string, email: string, username: string, password: string,
		mfaKey: string, mfaCode: string, createdTime: string): Promise<CreateAccountResponse>
	{
		return axiosHelper.post('Session/CreateAccount', {
			FirstName: firstName,
			LastName: lastName,
			Email: email,
			Username: username,
			Password: password,
			MFAKey: mfaKey,
			MFACode: mfaCode,
			CreatedTime: createdTime,
		});
	}

	function validateUsernameAndPassword(username: string, password: string): Promise<ValidateUsernameAndPasswordResponse>
	{
		return axiosHelper.post('Session/ValidateEmailAndUsername', {
			Username: username,
			Password: password,
		});
	}

	function validateMFACode(username: string, password: string, mfaCode: string): Promise<ValidateMFACodeResponse>
	{
		return axiosHelper.post('Session/ValidateMFACode', {
			Username: username,
			Password: password,
			MFACode: mfaCode,
		});
	}

	function expire(): Promise<BaseResponse>
	{
		return axiosHelper.post('Session/Expire', {});
	}

	return {
		validateEmailAndUsername,
		generateMFA,
		createAccount,
		validateUsernameAndPassword,
		validateMFACode,
		expire
	}
}
