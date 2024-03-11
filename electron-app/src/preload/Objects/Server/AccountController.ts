import { BaseResponse, CreateAccountResponse, GenerateMFAResponse, ValidateEmailAndUsernameResponse, ValidateMFACodeResponse, ValidateUsernameAndPasswordResponse } from "../../Types/Responses";
import cryptUtility from "../../Utilities/CryptUtility";
import { getDeviceInfo } from "../DeviceInfo";
import { AxiosHelper } from "./AxiosHelper"

export interface AccountController
{
	validateEmailAndUsername: (email: string, username: string) => Promise<ValidateEmailAndUsernameResponse>;
	generateMFA: () => Promise<GenerateMFAResponse>;
	createAccount: (firstName: string, lastName: string, email: string, username: string, password: string,
		mfaKey: string, mfaCode: string, createdTime: string) => Promise<CreateAccountResponse>;
	validateUsernameAndPassword: (username: string, password: string) => Promise<ValidateUsernameAndPasswordResponse>;
	validateMFACode: (username: string, password: string, mfaCode: string) => Promise<ValidateMFACodeResponse>;
	syncUserData: (key: string, appData: string, settingsData: string, passwordsValueData: string,
		filterData: string, groupData: string) => Promise<any>;
	getUserData: () => Promise<any>;
	deleteDevice: (desktopDeviceID?: number, mobileDeviceID?: number) => Promise<BaseResponse>;
}

export function createAccountController(axiosHelper: AxiosHelper): AccountController
{
	function validateEmailAndUsername(email: string, username: string): Promise<ValidateEmailAndUsernameResponse>
	{
		return axiosHelper.post('Account/ValidateEmailAndUsername', {
			Email: email,
			Username: username
		});
	}

	function generateMFA(): Promise<GenerateMFAResponse>
	{
		return axiosHelper.get('Account/GenerateMFA');
	}

	function createAccount(firstName: string, lastName: string, email: string, username: string, password: string,
		mfaKey: string, mfaCode: string, createdTime: string): Promise<CreateAccountResponse>
	{
		return axiosHelper.post('Account/CreateAccount', {
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
		return axiosHelper.post('Account/ValidateEmailAndUsername', {
			Username: username,
			Password: password,
		});
	}

	function validateMFACode(username: string, password: string, mfaCode: string): Promise<ValidateMFACodeResponse>
	{
		return axiosHelper.post('Account/ValidateMFACode', {
			Username: username,
			Password: password,
			MFACode: mfaCode,
		});
	}

	function syncUserData(key: string, appData: string, settingsData: string, passwordsValueData: string, filterData: string, groupData: string)
	{
		return axiosHelper.post('Account/SyncUserData', {
			AppData: cryptUtility.encrypt(key, appData),
			SettingsData: cryptUtility.encrypt(key, settingsData),
			PasswordsValueData: cryptUtility.encrypt(key, passwordsValueData),
			FilterData: cryptUtility.encrypt(key, filterData),
			GroupData: cryptUtility.encrypt(key, groupData)
		});
	}

	function getUserData(): Promise<any>
	{
		return axiosHelper.get('Account/GetUserData');
	}

	function deleteDevice(desktopDeviceID?: number, mobileDeviceID?: number)
	{
		return axiosHelper.post('Account/DeleteDevice', {
			UserDesktopDeviceID: desktopDeviceID,
			UserMobileDeviceID: mobileDeviceID
		})
	}

	return {
		validateEmailAndUsername,
		generateMFA,
		createAccount,
		validateUsernameAndPassword,
		validateMFACode,
		syncUserData,
		getUserData,
		deleteDevice
	}
}
