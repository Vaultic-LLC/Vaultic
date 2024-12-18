import { AllowSharingFrom, ModifiedOrgMember } from "./ClientServerTypes";
import { Member } from "./DataTypes";
import { BaseResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, GenerateRandomPhraseResponse, GetChartDataResponse, GetDevicesResponse, GetOrganizationsResponse, GetSharingSettings, GetUserDataBreachesResponse, GetVaultMembersResponse, LogResponse, SearchForUsersResponse, UpdateSharingSettingsResponse, UseSessionLicenseAndDeviceAuthenticationResponse, ValidateEmailResponse } from "./Responses";

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
    searchForUsers: (username: string) => Promise<SearchForUsersResponse>
}

export interface ValueController
{
    generateRandomPhrase: (length: number) => Promise<GenerateRandomPhraseResponse>;
}

export interface ClientVaultController 
{
    deleteVault: (userOrganizationID: number, userVaultID: number) => Promise<BaseResponse>;
    getMembers: (userOrganizationID: number, userVaultID: number) => Promise<GetVaultMembersResponse>;
}

export interface OrganizationController
{
    getOrganizations: () => Promise<GetOrganizationsResponse>;
    createOrganization: (name: string, addedMembers: Member[]) => Promise<BaseResponse>;
    updateOrganization: (organizationID: number, name?: string, addedMembers?: Member[], updatedMembers?: Member[], removedMembers?: Member[]) => Promise<BaseResponse>
    deleteOrganization: (organizationID: number) => Promise<BaseResponse>
}