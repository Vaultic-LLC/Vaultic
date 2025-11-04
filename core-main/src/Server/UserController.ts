import { BackupResponse, BaseResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, GetChartDataResponse, GetDevicesResponse, GetMFAKeyResponse, GetPublicKeysResponse, GetSettings, GetUserIDResponse, GetUserInfoResponse, RegisterDeviceResponse, SearchForUsersResponse, StartRegistrationResponse, UpdateSharingSettingsResponse, UseSessionLicenseAndDeviceAuthenticationResponse, ValidateEmailResponse, VerifyEmailResponse } from "@vaultic/shared/Types/Responses";
import { userDataE2EEncryptedFieldTree } from "../Types/FieldTree";
import { AxiosHelper } from "./AxiosHelper";
import { ClientUserController } from "@vaultic/shared/Types/Controllers";
import { ServerAllowSharingFrom, UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";
import { RequireMFAOn, RequiresMFA } from "@vaultic/shared/Types/Device";
import { PublicKeyType } from "@vaultic/shared/Types/Keys";

export interface UserController extends ClientUserController
{
    getUserIDs: () => Promise<GetUserIDResponse>;
    backupData: (postData: { userDataPayload: UserDataPayload }) => Promise<BackupResponse>;
    getPublicKeys: (publicKeyType: PublicKeyType, userIDs: number[]) => Promise<GetPublicKeysResponse>;
    startUpdateKSFParams: (registrationRequest: string) => Promise<StartRegistrationResponse>;
    finishUpdateKSFParams: (registrationRecord: string, userDataPayload: UserDataPayload) => Promise<BaseResponse>;
    deleteAccount: () => Promise<BaseResponse>;
}

export function createUserController(axiosHelper: AxiosHelper): UserController
{
    function validateEmail(email: string): Promise<ValidateEmailResponse>
    {
        return axiosHelper.sts.post('User/ValidateEmail', {
            Email: email,
        });
    }

    function verifyEmail(pendingUserToken: string, emailVerificationCode: string): Promise<VerifyEmailResponse>
    {
        return axiosHelper.sts.post('User/VerifyEmail', {
            Token: pendingUserToken,
            VerificationCode: emailVerificationCode
        });
    }

    function getUserIDs(): Promise<GetUserIDResponse>
    {
        return axiosHelper.api.post("User/GetUserIDs");
    }

    function getDevices(): Promise<GetDevicesResponse>
    {
        return axiosHelper.api.post('User/GetDevices');
    }

    function registerDevice(name: string, requiresMFA: RequiresMFA): Promise<RegisterDeviceResponse>
    {
        return axiosHelper.api.post('User/RegisterDevice', {
            Name: name,
            RequiresMFA: requiresMFA
        });
    }

    function updateDevice(name: string, requiresMFA: RequiresMFA, desktopDeviceID?: number, mobileDeviceID?: number): Promise<BaseResponse>
    {
        return axiosHelper.api.post('User/UpdateDevice', {
            UserDesktopDeviceID: desktopDeviceID,
            UserMobileDeviceID: mobileDeviceID,
            Name: name,
            RequiresMFA: requiresMFA
        });
    }

    function deleteDevice(desktopDeviceID?: number, mobileDeviceID?: number): Promise<DeleteDeviceResponse>
    {
        return axiosHelper.api.post('User/DeleteDevice', {
            UserDesktopDeviceID: desktopDeviceID,
            UserMobileDeviceID: mobileDeviceID
        });
    }

    async function backupData(postData: { userDataPayload: UserDataPayload }): Promise<BackupResponse>
    {
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

    function getSettings(): Promise<GetSettings>
    {
        return axiosHelper.api.post('User/GetSettings');
    }

    function updateSettings(username?: string, allowSharedVaultsFromOthers?: boolean, allowSharingFrom?: ServerAllowSharingFrom,
        addedAllowSharingFrom?: number[], removedAllowSharingFrom?: number[], requireMFAOn?: RequireMFAOn): Promise<UpdateSharingSettingsResponse>
    {
        return axiosHelper.api.post('User/UpdateSettings', {
            Username: username,
            AllowSharedVaultsFromOthers: allowSharedVaultsFromOthers,
            AllowSharingFrom: allowSharingFrom,
            AddedAllowSharingFromUsers: addedAllowSharingFrom,
            RemovedAllowSharingFromUsers: removedAllowSharingFrom,
            RequireMFAOn: requireMFAOn
        });
    }

    function searchForUsers(username: string, excludedUserIDs: string): Promise<SearchForUsersResponse>
    {
        const userIDs: number[] = JSON.parse(excludedUserIDs);
        return axiosHelper.api.post('User/SearchForUsers', {
            Username: username,
            ExcludedUserIDs: userIDs
        });
    }

    function getPublicKeys(publicKeyType: PublicKeyType, userIDs: number[]): Promise<GetPublicKeysResponse>
    {
        return axiosHelper.api.post('User/GetPublicKeys', {
            PublicKeyType: publicKeyType,
            UserIDs: userIDs,
        });
    }

    function getMFAKey(): Promise<GetMFAKeyResponse>
    {
        return axiosHelper.api.post('User/GetMFAKey');
    }

    function getUserInfo(): Promise<GetUserInfoResponse>
    {
        return axiosHelper.api.post('User/GetUserInfo');
    }

    function startUpdateKSFParams(registrationRequest: string): Promise<StartRegistrationResponse>
    {
        return axiosHelper.api.post('User/StartUpdateKSFParams', {
            StartClientRegistrationRequest: registrationRequest
        });
    }

    function finishUpdateKSFParams(registrationResponse: string, userDataPayload: UserDataPayload): Promise<BaseResponse>
    {
        return axiosHelper.api.post('User/FinishUpdateKSFParams', {
            FinishClientRegistrationRecord: registrationResponse,
            UserDataPayload: userDataPayload,
        });
    }

    function startEmailVerification(email: string)
    {
        return axiosHelper.api.post('User/StartEmailVerification', {
            Email: email,
        });
    }

    function finishEmailVerification(code: string)
    {
        return axiosHelper.api.post('User/FinishEmailVerification', {
            VerificationCode: code,
        });
    }

    function deleteAccount(): Promise<BaseResponse>
    {
        return axiosHelper.api.post('User/DeleteAccount');
    }

    return {
        validateEmail,
        verifyEmail,
        getUserIDs,
        getDevices,
        registerDevice,
        updateDevice,
        deleteDevice,
        backupData,
        createCheckout,
        getChartData,
        deactivateUserSubscription,
        reportBug,
        getSettings,
        updateSettings,
        searchForUsers,
        getPublicKeys,
        getMFAKey,
        getUserInfo,
        startUpdateKSFParams,
        finishUpdateKSFParams,
        startEmailVerification,
        finishEmailVerification,
        deleteAccount
    }
}
