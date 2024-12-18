import { BackupResponse, BaseResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, GetChartDataResponse, GetDevicesResponse, GetSharingSettings, GetUserDataBreachesResponse, GetUserIDResponse, SearchForUsersResponse, UpdateSharingSettingsResponse, UseSessionLicenseAndDeviceAuthenticationResponse, ValidateEmailResponse } from "@vaultic/shared/Types/Responses";
import { userDataE2EEncryptedFieldTree } from "../Types/FieldTree";
import { AxiosHelper } from "./AxiosHelper";
import { ClientUserController } from "@vaultic/shared/Types/Controllers";
import { AllowSharingFrom, UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";

export interface UserController extends ClientUserController
{
    getUserIDs: () => Promise<GetUserIDResponse>;
    backupData: (postData: { userDataPayload: UserDataPayload }) => Promise<BackupResponse>;
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

    async function backupData(postData: { userDataPayload: UserDataPayload }): Promise<BackupResponse>
    {
        console.time("10");
        const e2eEncryptedData = await axiosHelper.api.endToEndEncryptPostData(userDataE2EEncryptedFieldTree, postData);
        if (!e2eEncryptedData.success)
        {
            return { Success: false, message: e2eEncryptedData.errorMessage }
        }
        console.timeEnd("10");
        console.time("11");
        const response = await axiosHelper.api.post("User/BackupData", e2eEncryptedData.value);
        console.timeEnd("11");
        return { ...response, message: `Post data: ${JSON.vaulticStringify(postData)}` }
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

    function getSharingSettings(): Promise<GetSharingSettings>
    {
        return axiosHelper.api.post('User/GetSharingSettings');
    }

    function updateSharingSettings(username?: string, allowSharedVaultsFromOthers?: boolean, allowSharingFrom?: AllowSharingFrom): Promise<UpdateSharingSettingsResponse>
    {
        return axiosHelper.api.post('User/UpdateSharingSettings', {
            Username: username,
            AllowSharedVaultsFromOthers: allowSharedVaultsFromOthers,
            AllowSharingFrom: allowSharingFrom
        });
    }

    function searchForUsers(username: string): Promise<SearchForUsersResponse>
    {
        return axiosHelper.api.post('User/SearchForUsers', {
            Username: username,
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
        getSharingSettings,
        updateSharingSettings,
        searchForUsers
    }
}
