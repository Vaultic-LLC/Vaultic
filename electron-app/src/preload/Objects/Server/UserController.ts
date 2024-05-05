import { BaseResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, GetUserDataBreachesResponse, LoadDataResponse, UpdateDeviceRespnose, UseSessionLicenseAndDeviceAuthenticationResposne, UserSessionAndDeviceAuthenticationRespons } from "../../Types/Responses";
import { AxiosHelper } from "../../Types/ServerTypes";

export interface UserController
{
	deleteDevice: (desktopDeviceID?: number, mobileDeviceID?: number) => Promise<DeleteDeviceResponse>;
	registerDevice: () => Promise<UpdateDeviceRespnose>;
	backupSetings(settingsState: string): Promise<UseSessionLicenseAndDeviceAuthenticationResposne>;
	backupAppStore(settingsState: string): Promise<UseSessionLicenseAndDeviceAuthenticationResposne>
	backupUserPreferences(settingsState: string): Promise<UseSessionLicenseAndDeviceAuthenticationResposne>
	getUserData: () => Promise<LoadDataResponse>;
	createCheckout: () => Promise<CreateCheckoutResponse>;
	getUserDataBreaches: (passwordStoreState: string) => Promise<GetUserDataBreachesResponse>;
	dismissUserDataBreach: (breachID: number) => Promise<BaseResponse>;
	deactivateUserSubscription: (email: string, deactivationKey: string) => Promise<DeactivateUserSubscriptionResponse>;
	test: (key: string) => Promise<any>
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
		return axiosHelper.post('User/RegisterDevice');
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
