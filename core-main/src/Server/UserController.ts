import { User } from "../Database/Entities/User";
import { UserVault } from "../Database/Entities/UserVault";
import { Vault } from "../Database/Entities/Vault";
import { userDataE2EEncryptedFieldTree } from "../Types/FieldTree";
import { BaseResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, GetChartDataResponse, GetDevicesResponse, GetUserDataBreachesResponse, GetUserIDResponse, GetVaultDataResponse, UseSessionLicenseAndDeviceAuthenticationResponse, ValidateEmailResponse } from "../Types/Responses";
import { AxiosHelper } from "./AxiosHelper";

export interface UserController
{
    validateEmail(email: string): Promise<ValidateEmailResponse>;
    getUserIDs: () => Promise<GetUserIDResponse>;
    deleteDevice: (masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => Promise<DeleteDeviceResponse>;
    getDevices: () => Promise<GetDevicesResponse>;
    backupData: (user?: Partial<User> | null, userVaults?: Partial<UserVault>[] | null, vaults?: Partial<Vault>[] | null) => Promise<BaseResponse>;
    createCheckout: () => Promise<CreateCheckoutResponse>;
    getChartData: (data: string) => Promise<GetChartDataResponse>;
    getUserDataBreaches: (passwordStoreState: string) => Promise<GetUserDataBreachesResponse>;
    dismissUserDataBreach: (breachID: number) => Promise<BaseResponse>;
    deactivateUserSubscription: (email: string, deactivationKey: string) => Promise<DeactivateUserSubscriptionResponse>;
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

    async function backupData(user?: Partial<User> | null, userVaults?: Partial<UserVault>[] | null, vaults?: Partial<Vault>[] | null): Promise<BaseResponse>
    {
        const postData = { userDataPayload: {} };
        if (user)
        {
            postData.userDataPayload["user"] = user;
        }

        if (userVaults && userVaults.length > 0)
        {
            postData.userDataPayload["userVaults"] = userVaults;
        }

        if (vaults && vaults.length > 0)
        {
            postData.userDataPayload["vaults"] = vaults;
        }

        console.log(`Data to backup: ${JSON.stringify(postData)}`);
        console.log('\n')
        const e2eEncryptedData = await axiosHelper.api.endToEndEncryptPostData(userDataE2EEncryptedFieldTree, postData);
        if (!e2eEncryptedData.success)
        {
            return { Success: false, message: e2eEncryptedData.errorMessage }
        }

        const response = await axiosHelper.api.post("User/BackupData", e2eEncryptedData.value);
        return { ...response, message: `Post data: ${JSON.stringify(postData)}` }
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
        createCheckout,
        getChartData,
        getUserDataBreaches,
        dismissUserDataBreach,
        deactivateUserSubscription,
        reportBug,
    }
}
