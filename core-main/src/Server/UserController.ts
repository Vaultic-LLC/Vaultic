import { User } from "../Database/Entities/User";
import { UserVault } from "../Database/Entities/UserVault";
import { Vault } from "../Database/Entities/Vault";
import { BaseResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, GetChartDataResponse, GetDevicesResponse, GetUserDataBreachesResponse, GetUserIDResponse, LoadDataResponse, UseSessionLicenseAndDeviceAuthenticationResponse, ValidateEmailResponse } from "../Types/Responses";
import { AxiosHelper } from "./AxiosHelper";

export interface UserController
{
    validateEmail(email: string): Promise<ValidateEmailResponse>;
    getUserID: () => Promise<GetUserIDResponse>;
    deleteDevice: (masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => Promise<DeleteDeviceResponse>;
    backupData: (user?: User, userVault?: UserVault[], vault?: Vault[]) => Promise<BaseResponse>;
    backupStores(data: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>;
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
    function validateEmail(email: string): Promise<ValidateEmailResponse>
    {
        return axiosHelper.sts.post('User/ValidateEmail', {
            Email: email,
        });
    }

    function getUserID(): Promise<GetUserIDResponse>
    {
        return axiosHelper.api.post("User/GetUserID");
    }

    function deleteDevice(masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number): Promise<DeleteDeviceResponse>
    {
        return axiosHelper.api.post('User/DeleteDevice', {
            MasterKey: masterKey,
            UserDesktopDeviceID: desktopDeviceID,
            UserMobileDeviceID: mobileDeviceID
        });
    }

    function getDevices(): Promise<GetDevicesResponse>
    {
        return axiosHelper.api.post('User/GetDevices');
    }

    async function backupData(user?: User, userVault?: UserVault[], vault?: Vault[]): Promise<BaseResponse>
    {
        const postData = {};
        if (user)
        {
            const encryptedUser = await axiosHelper.api.endToEndEncryptPostData(user);
            if (!encryptedUser.success)
            {
                return { Success: false }
            }

            postData["user"] = encryptedUser.value!;
        }

        if (userVault)
        {
            postData["userVaults"] = [];
            for (let i = 0; i < userVault.length; i++)
            {
                const encryptedUserVault = await axiosHelper.api.endToEndEncryptPostData(userVault[i]);
                if (!encryptedUserVault.success)
                {
                    return { Success: false };
                }

                postData["userVaults"].push(encryptedUserVault.value);
            }
        }

        if (vault)
        {
            postData["vaults"] = [];
            for (let i = 0; i < vault.length; i++)
            {
                const encryptedVault = await axiosHelper.api.endToEndEncryptPostData(vault[i]);
                if (!encryptedVault.success)
                {
                    return { Success: false };
                }

                postData["vaults"].push(encryptedVault.value);
            }
        }

        return axiosHelper.api.post("User/BackupData", postData);
    }

    async function backupStores(data: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
    {
        const stores = JSON.parse(data);
        const response = await axiosHelper.api.endToEndEncryptPostData(stores);
        if (!response.success)
        {
            return { Success: false, message: response.errorMessage }
        }

        return axiosHelper.api.post('User/BackupStores', response.value)
    }

    async function getUserData(): Promise<LoadDataResponse>
    {
        const properties = ['appStoreState', 'settingsStoreState', 'filterStoreState', 'groupStoreState', 'passwordStoreState',
            'valueStoreState', 'userPreferencesStoreState'];

        let response = await axiosHelper.api.post('User/GetUserData');
        const decryptedData = await axiosHelper.api.decryptEndToEndData(properties, response);
        if (!decryptedData.success)
        {
            return { Success: false, message: "Unable to decrypt data" };
        }

        response = Object.assign(response, decryptedData);
        return response;
    }

    function createCheckout(): Promise<CreateCheckoutResponse>
    {
        return axiosHelper.api.post("User/CreateCheckout");
    }

    function getChartData(data: string): Promise<GetChartDataResponse>
    {
        return axiosHelper.api.post("User/GetChartData", data);
    }

    function getUserDataBreaches(passwordStoreState: string): Promise<GetUserDataBreachesResponse>
    {
        return axiosHelper.api.post("User/GetUserDataBreaches", passwordStoreState);
    }

    function dismissUserDataBreach(userDataBreachID: number): Promise<BaseResponse>
    {
        return axiosHelper.api.post("User/DismissUserDataBreach", {
            UserDataBreachID: userDataBreachID
        });
    }

    function deactivateUserSubscription(email: string, deactivationKey: string): Promise<DeactivateUserSubscriptionResponse>
    {
        return axiosHelper.api.post("User/DeactivateUserSubscription", {
            Email: email,
            DeactivationKey: deactivationKey
        });
    }

    function reportBug(description: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>
    {
        return axiosHelper.api.post('User/ReportBug', {
            Description: description
        });
    }

    return {
        validateEmail,
        getUserID,
        deleteDevice,
        getDevices,
        backupData,
        backupStores,
        getUserData,
        createCheckout,
        getChartData,
        getUserDataBreaches,
        dismissUserDataBreach,
        deactivateUserSubscription,
        reportBug,
    }
}
