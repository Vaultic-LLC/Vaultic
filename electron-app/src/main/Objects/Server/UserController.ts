import { BaseResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, GetChartDataResponse, GetDevicesResponse, GetUserDataBreachesResponse, LoadDataResponse, UpdateDeviceRespnose, UseSessionLicenseAndDeviceAuthenticationResponse } from "../../Types/Responses";
import { AxiosHelper } from "../../Types/ServerTypes";

export interface UserController
{
	deleteDevice: (masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => Promise<DeleteDeviceResponse>;
	backupSettings: (data: string) => Promise<UseSessionLicenseAndDeviceAuthenticationResponse>;
	backupAppStore: (data: string) => Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
	backupUserPreferences: (data: string) => Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
	getUserData: () => Promise<LoadDataResponse>;
	createCheckout: () => Promise<CreateCheckoutResponse>;
	getChartData: (data: string) => Promise<GetChartDataResponse>;
	getUserDataBreaches: (passwordStoreState: string) => Promise<GetUserDataBreachesResponse>;
	dismissUserDataBreach: (breachID: number) => Promise<BaseResponse>;
	deactivateUserSubscription: (email: string, deactivationKey: string) => Promise<DeactivateUserSubscriptionResponse>;
	getDevices: () => Promise<GetDevicesResponse>;
	reportBug: (description: string) => Promise<UseSessionLicenseAndDeviceAuthenticationResponse>;
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

	function getDevices(): Promise<GetDevicesResponse>
	{
		return axiosHelper.post('User/GetDevices');
	}

	function backupSettings(data: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
	{
		return axiosHelper.post('User/BackupSettings', data);
	}

	function backupAppStore(data: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
	{
		return axiosHelper.post('User/BackupAppStore', data);
	}

	function backupUserPreferences(data: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
	{
		return axiosHelper.post('User/BackupSettings', data);
	}

	function getUserData(): Promise<LoadDataResponse>
	{
		return axiosHelper.post('User/GetUserData');
	}

	function createCheckout(): Promise<CreateCheckoutResponse>
	{
		return axiosHelper.post("User/CreateCheckout");
	}

	function getChartData(data: string): Promise<GetChartDataResponse>
	{
		return axiosHelper.post("User/GetChartData", data);
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

	function reportBug(description: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
	{
		return axiosHelper.post('User/ReportBug', {
			Description: description
		});
	}

	return {
		deleteDevice,
		getDevices,
		backupSettings,
		backupAppStore,
		backupUserPreferences,
		getUserData,
		createCheckout,
		getChartData,
		getUserDataBreaches,
		dismissUserDataBreach,
		deactivateUserSubscription,
		reportBug,
	}
}
