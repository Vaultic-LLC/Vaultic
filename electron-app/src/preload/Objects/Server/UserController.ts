import { BaseResponse, DeleteDeviceResponse, LoadDataResponse, UpdateDeviceRespnose, UseSessionLicenseAndDeviceAuthenticationResposne } from "../../Types/Responses";
import cryptUtility from "../../Utilities/CryptUtility";
import { AxiosHelper } from "./AxiosHelper"

export interface UserController
{
	deleteDevice: (desktopDeviceID?: number, mobileDeviceID?: number) => Promise<DeleteDeviceResponse>;
	registerDevice: () => Promise<UpdateDeviceRespnose>;
	backupSetings(settingsState: string): Promise<UseSessionLicenseAndDeviceAuthenticationResposne>;
	backupAppStore(settingsState: string): Promise<UseSessionLicenseAndDeviceAuthenticationResposne>
	backupUserPreferences(settingsState: string): Promise<UseSessionLicenseAndDeviceAuthenticationResposne>
	getUserData: () => Promise<LoadDataResponse>;
	test: (value: string) => Promise<any>
}

export function createUserController(axiosHelper: AxiosHelper): UserController
{
	function deleteDevice(desktopDeviceID?: number, mobileDeviceID?: number): Promise<DeleteDeviceResponse>
	{
		return axiosHelper.post('User/DeleteDevice', {
			UserDesktopDeviceID: desktopDeviceID,
			UserMobileDeviceID: mobileDeviceID
		})
	}

	function registerDevice(): Promise<UpdateDeviceRespnose>
	{
		return axiosHelper.get('User/RegisterDevice');
	}

	function backupSetings(settingsState: string): Promise<UseSessionLicenseAndDeviceAuthenticationResposne>
	{
		return axiosHelper.post('User/BackupSettings', {
			SettingsStoreState: settingsState
		});
	}

	function backupAppStore(appStoreState: string): Promise<UseSessionLicenseAndDeviceAuthenticationResposne>
	{
		return axiosHelper.post('User/BackupAppStore', {
			AppStoreState: appStoreState
		});
	}

	function backupUserPreferences(userPreferences: string): Promise<UseSessionLicenseAndDeviceAuthenticationResposne>
	{
		return axiosHelper.post('User/BackupSettings', {
			UserPreferencesStoreState: userPreferences
		});
	}

	function getUserData(): Promise<LoadDataResponse>
	{
		return axiosHelper.get('User/GetUserData');
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
		deleteDevice,
		registerDevice,
		backupSetings,
		backupAppStore,
		backupUserPreferences,
		getUserData,
		test
	}
}
