import { BaseResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, GetDevicesResponse, GetUserDataBreachesResponse, LoadDataResponse, UpdateDeviceRespnose, UseSessionLicenseAndDeviceAuthenticationResponse, UserSessionAndDeviceAuthenticationRespons } from "../../Types/Responses";
import { AxiosHelper } from "../../Types/ServerTypes";

export interface UserController
{
	deleteDevice: (masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => Promise<DeleteDeviceResponse>;
	registerDevice: () => Promise<UpdateDeviceRespnose>;
	backupSetings(settingsState: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>;
	backupAppStore(settingsState: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
	backupUserPreferences(settingsState: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
	getUserData: () => Promise<LoadDataResponse>;
	createCheckout: () => Promise<CreateCheckoutResponse>;
	getUserDataBreaches: (passwordStoreState: string) => Promise<GetUserDataBreachesResponse>;
	dismissUserDataBreach: (breachID: number) => Promise<BaseResponse>;
	deactivateUserSubscription: (email: string, deactivationKey: string) => Promise<DeactivateUserSubscriptionResponse>;
	getDevices: () => Promise<GetDevicesResponse>;
	test: (key: string) => Promise<any>
}

export function createUserController(axiosHelper: AxiosHelper): UserController
{
	function deleteDevice(masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number): Promise<DeleteDeviceResponse>
	{
		return axiosHelper.post('User/DeleteDevice', {
			MasterKey: masterKey,
			UserDesktopDeviceID: desktopDeviceID,
			UserMobileDeviceID: mobileDeviceID
		});
	}

	function registerDevice(): Promise<UpdateDeviceRespnose>
	{
		return axiosHelper.post('User/RegisterDevice');
	}

	function getDevices(): Promise<GetDevicesResponse>
	{
		return axiosHelper.post('User/GetDevices');
	}

	function backupSetings(settingsState: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
	{
		return axiosHelper.post('User/BackupSettings', {
			SettingsStoreState: settingsState
		});
	}

	function backupAppStore(appStoreState: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
	{
		return axiosHelper.post('User/BackupAppStore', {
			AppStoreState: appStoreState
		});
	}

	function backupUserPreferences(userPreferences: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
	{
		return axiosHelper.post('User/BackupSettings', {
			UserPreferencesStoreState: userPreferences
		});
	}

	function getUserData(): Promise<LoadDataResponse>
	{
		return axiosHelper.post('User/GetUserData');
	}

	function createCheckout(): Promise<CreateCheckoutResponse>
	{
		return axiosHelper.post("User/CreateCheckout");
	}

	function getUserDataBreaches(passwordStoreState: string): Promise<GetUserDataBreachesResponse>
	{
		return axiosHelper.post("User/GetUserDataBreaches", passwordStoreState);
	}

	function dismissUserDataBreach(userDataBreachID: number): Promise<BaseResponse>
	{
		return axiosHelper.post("User/DismissUserDataBreach", {
			UserDataBreachID: userDataBreachID
		});
	}

	function deactivateUserSubscription(email: string, deactivationKey: string): Promise<DeactivateUserSubscriptionResponse>
	{
		return axiosHelper.post("User/DeactivateUserSubscription", {
			Email: email,
			DeactivationKey: deactivationKey
		});
	}

	async function test(key: string): Promise<any>
	{
		return axiosHelper.post("User/Test", { key });
	}

	return {
		deleteDevice,
		registerDevice,
		getDevices,
		backupSetings,
		backupAppStore,
		backupUserPreferences,
		getUserData,
		createCheckout,
		getUserDataBreaches,
		dismissUserDataBreach,
		deactivateUserSubscription,
		test
	}
}
