import { BaseResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, GetChartDataResponse, GetDevicesResponse, GetUserDataBreachesResponse, LoadDataResponse, UseSessionLicenseAndDeviceAuthenticationResponse } from "../Types/Responses";
import { AxiosHelper } from "../Types/ServerTypes";

export interface UserController
{
    deleteDevice: (masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => Promise<DeleteDeviceResponse>;
    backupSettings: (data: string) => Promise<UseSessionLicenseAndDeviceAuthenticationResponse>;
    backupAppStore: (data: string) => Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
    backupUserPreferences: (data: string) => Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
    getUserData: (masterKey: string) => Promise<LoadDataResponse>;
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
        return axiosHelper.postAPI('User/DeleteDevice', {
            MasterKey: masterKey,
            UserDesktopDeviceID: desktopDeviceID,
            UserMobileDeviceID: mobileDeviceID
        });
    }

    function getDevices(): Promise<GetDevicesResponse>
    {
        return axiosHelper.postAPI('User/GetDevices');
    }

    function backupSettings(data: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
    {
        return axiosHelper.postAPI('User/BackupSettings', data);
    }

    function backupAppStore(data: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
    {
        return axiosHelper.postAPI('User/BackupAppStore', data);
    }

    function backupUserPreferences(data: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
    {
        return axiosHelper.postAPI('User/BackupSettings', data);
    }

    function getUserData(masterKey: string): Promise<LoadDataResponse>
    {
        return axiosHelper.postAPI('User/GetUserData', {
            MasterKey: masterKey
        });
    }

    function createCheckout(): Promise<CreateCheckoutResponse>
    {
        return axiosHelper.postAPI("User/CreateCheckout");
    }

    function getChartData(data: string): Promise<GetChartDataResponse>
    {
        return axiosHelper.postAPI("User/GetChartData", data);
    }

    function getUserDataBreaches(passwordStoreState: string): Promise<GetUserDataBreachesResponse>
    {
        return axiosHelper.postAPI("User/GetUserDataBreaches", passwordStoreState);
    }

    function dismissUserDataBreach(userDataBreachID: number): Promise<BaseResponse>
    {
        return axiosHelper.postAPI("User/DismissUserDataBreach", {
            UserDataBreachID: userDataBreachID
        });
    }

    function deactivateUserSubscription(email: string, deactivationKey: string): Promise<DeactivateUserSubscriptionResponse>
    {
        return axiosHelper.postSTS("User/DeactivateUserSubscription", {
            Email: email,
            DeactivationKey: deactivationKey
        });
    }

    function reportBug(description: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
    {
        return axiosHelper.postAPI('User/ReportBug', {
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
