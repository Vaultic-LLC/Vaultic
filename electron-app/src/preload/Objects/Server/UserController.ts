import { DeleteDeviceResponse } from "../../Types/Responses";
import cryptUtility from "../../Utilities/CryptUtility";
import { AxiosHelper } from "./AxiosHelper"

export interface UserController
{
	syncUserData: (key: string, appData: string, settingsData: string, passwordsValueData: string,
		filterData: string, groupData: string) => Promise<any>;
	getUserData: () => Promise<any>;
	deleteDevice: (desktopDeviceID?: number, mobileDeviceID?: number) => Promise<DeleteDeviceResponse>;
	test: (value: string) => Promise<any>
}

export function createUserController(axiosHelper: AxiosHelper): UserController
{
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

	function test(value: string): Promise<any>
	{
		const methodResponse = cryptUtility.publicEncrypt(value);
		console.log(methodResponse);

		return axiosHelper.post("User/Test",
			{
				encryption: methodResponse.value
			});
	}

	return {
		syncUserData,
		getUserData,
		deleteDevice,
		test
	}
}
