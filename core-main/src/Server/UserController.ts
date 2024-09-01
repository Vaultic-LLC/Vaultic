import { User } from "../Database/Entities/User";
import { UserVault } from "../Database/Entities/UserVault";
import { Vault } from "../Database/Entities/Vault";
import { BaseResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, GetChartDataResponse, GetDevicesResponse, GetUserDataBreachesResponse, GetUserIDResponse, LoadDataResponse, UseSessionLicenseAndDeviceAuthenticationResponse, ValidateEmailResponse } from "../Types/Responses";
import { AxiosHelper } from "./AxiosHelper";

export interface UserController
{
    validateEmail(email: string): Promise<ValidateEmailResponse>;
    getUserIDs: () => Promise<GetUserIDResponse>;
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

    function getUserIDs(): Promise<GetUserIDResponse>
    {
        return axiosHelper.api.post("User/GetUserIDs");
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

    async function backupData(user?: User, userVaults?: UserVault[], vaults?: Vault[]): Promise<BaseResponse>
    {
        const postData = {};
        if (user)
        {
            const { userID, publicKey, ...userWithoutID } = user;
            const encryptedUser = await axiosHelper.api.endToEndEncryptPostData(userWithoutID);

            if (!encryptedUser.success)
            {
                return { Success: false, message: encryptedUser.errorMessage }
            }

            postData["user"] = { userID, publicKey, ...encryptedUser.value! };
        }

        if (userVaults)
        {
            postData["userVaults"] = [];
            for (let i = 0; i < userVaults.length; i++)
            {
                const { userVaultID, ...userVaultWithoutID } = userVaults[i];
                const encryptedUserVault = await axiosHelper.api.endToEndEncryptPostData(userVaultWithoutID);

                if (!encryptedUserVault.success)
                {
                    return { Success: false, message: `userVault encryption failed. ${encryptedUserVault.errorMessage}` };
                }

                postData["userVaults"].push({ userVaultID, ...encryptedUserVault.value });
            }
        }

        // TODO: vaults can't be end to end encrypted since they can be shared with multiple users
        if (vaults)
        {
            postData["vaults"] = [];
            for (let i = 0; i < vaults.length; i++)
            {
                const { vaultID, ...vaultWithoutID } = vaults[i];
                const encryptedVault = await axiosHelper.api.endToEndEncryptPostData(vaultWithoutID);

                if (!encryptedVault.success)
                {
                    return { Success: false, message: "vault encryption failed" };
                }

                postData["vaults"].push({ vaultID, ...encryptedVault.value });
            }
        }

        const response = await axiosHelper.api.post("User/BackupData", postData);
        return { ...response, message: `Post data: ${JSON.stringify(postData)}` }
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
        getUserIDs,
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
