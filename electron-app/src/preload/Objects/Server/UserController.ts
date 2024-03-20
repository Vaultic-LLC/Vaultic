import { CreateAccountResponse, DeleteDeviceResponse, GenerateMFAResponse, ValidateEmailAndUsernameResponse, ValidateMFACodeResponse, ValidateUsernameAndPasswordResponse } from "../../Types/Responses";
import cryptUtility from "../../Utilities/CryptUtility";
import { AxiosHelper } from "./AxiosHelper"

export interface UserController
{
	finishUserSetup: (data: string) => Promise<any>;
	syncUserData: (key: string, appData: string, settingsData: string, passwordsValueData: string,
		filterData: string, groupData: string) => Promise<any>;
	getUserData: () => Promise<any>;
	deleteDevice: (desktopDeviceID?: number, mobileDeviceID?: number) => Promise<DeleteDeviceResponse>;
}

export function createUserController(axiosHelper: AxiosHelper): UserController
{
	function finishUserSetup(data: string)
	{
		return axiosHelper.post('User/FinishUserSetup', data);
	}

	function syncUserData(key: string, appData: string, settingsData: string, passwordsValueData: string, filterData: string, groupData: string)
	{
		return axiosHelper.post('User/SyncUserData', {
			AppData: cryptUtility.encrypt(key, appData),
			SettingsData: cryptUtility.encrypt(key, settingsData),
			PasswordsValueData: cryptUtility.encrypt(key, passwordsValueData),
			FilterData: cryptUtility.encrypt(key, filterData),
			GroupData: cryptUtility.encrypt(key, groupData)
		});
	}

	function getUserData(): Promise<any>
	{
		return axiosHelper.get('User/GetUserData');
	}

	function deleteDevice(desktopDeviceID?: number, mobileDeviceID?: number): Promise<DeleteDeviceResponse>
	{
		return axiosHelper.post('User/DeleteDevice', {
			UserDesktopDeviceID: desktopDeviceID,
			UserMobileDeviceID: mobileDeviceID
		})
	}

	return {
		finishUserSetup,
		syncUserData,
		getUserData,
		deleteDevice
	}
}
