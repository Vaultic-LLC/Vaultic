import { AllowSharingFrom, UserIDAndPermission } from "./ClientServerTypes";
import { BaseResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, GenerateRandomPhraseResponse, GetChartDataResponse, GetDevicesResponse, GetOrganizationsResponse, GetSharingSettings, GetUserDataBreachesResponse, LogResponse, UpdateSharingSettingsResponse, UseSessionLicenseAndDeviceAuthenticationResponse, ValidateEmailResponse } from "./Responses";

export interface AppController
{
    log: (exception: string, stack: string) => Promise<LogResponse>;
}

export interface SessionController
{
    expire: () => Promise<BaseResponse>;
}

export interface ClientUserController
{
    validateEmail(email: string): Promise<ValidateEmailResponse>;
    deleteDevice: (masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => Promise<DeleteDeviceResponse>;
    createCheckout: () => Promise<CreateCheckoutResponse>;
    getChartData: (data: string) => Promise<GetChartDataResponse>;
    getUserDataBreaches: (passwordStoreState: string) => Promise<GetUserDataBreachesResponse>;
    dismissUserDataBreach: (breachID: number) => Promise<BaseResponse>;
    deactivateUserSubscription: (email: string, deactivationKey: string) => Promise<DeactivateUserSubscriptionResponse>;
    getDevices: () => Promise<GetDevicesResponse>;
    reportBug: (description: string) => Promise<UseSessionLicenseAndDeviceAuthenticationResponse>;
    getSharingSettings: () => Promise<GetSharingSettings>;
    updateSharingSettings: (username?: string, allowSharedVaultsFromOthers?: boolean, allowSharingFrom?: AllowSharingFrom) => Promise<UpdateSharingSettingsResponse>;
}

export interface ValueController
{
    generateRandomPhrase: (length: number) => Promise<GenerateRandomPhraseResponse>;
}

export interface ClientVaultController 
{
    deleteVault: (userVaultID: number) => Promise<BaseResponse>;
}

export interface OrganizationController
{
    getOrganizations: () => Promise<GetOrganizationsResponse>;
    createOrganization: (name: string, userIDsAndPermissions: UserIDAndPermission[]) => Promise<BaseResponse>;
    updateOrganization: (organizationID: number, name?: string, addedUserIDsAndPermissions?: UserIDAndPermission[], removedUserIDsAndPermissions?: UserIDAndPermission[]) => Promise<BaseResponse>
    deleteOrganization: (organizationID: number) => Promise<BaseResponse>
}