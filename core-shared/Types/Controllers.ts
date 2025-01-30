import { ServerAllowSharingFrom } from "./ClientServerTypes";
import { BreachRequestVault, Member } from "./DataTypes";
import { RequireMFAOn } from "./Device";
import { UserVaultIDAndVaultID } from "./Entities";
import { BaseResponse, CreateCheckoutResponse, CreateOrganizationResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, GetChartDataResponse, GetDevicesResponse, GetMFAKeyResponse, GetOrganizationsResponse, GetSettings, GetVaultDataBreachesResponse, GetVaultMembersResponse, LogResponse, SearchForUsersResponse, UpdateSharingSettingsResponse, UseSessionLicenseAndDeviceAuthenticationResponse, ValidateEmailResponse } from "./Responses";

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
    deactivateUserSubscription: (email: string, deactivationKey: string) => Promise<DeactivateUserSubscriptionResponse>;
    getDevices: () => Promise<GetDevicesResponse>;
    reportBug: (description: string) => Promise<UseSessionLicenseAndDeviceAuthenticationResponse>;
    getSettings: () => Promise<GetSettings>;
    updateSettings: (username?: string, allowSharedVaultsFromOthers?: boolean, allowSharingFrom?: ServerAllowSharingFrom, addedAllowSharingFrom?: number[], removedAllowSharingFrom?: number[], requireMFAOn?: RequireMFAOn) => Promise<UpdateSharingSettingsResponse>;
    searchForUsers: (username: string, excludedUserIDs: string) => Promise<SearchForUsersResponse>;
    getMFAKey: () => Promise<GetMFAKeyResponse>;
}

export interface ClientVaultController 
{
    getMembers: (userOrganizationID: number, userVaultID: number) => Promise<GetVaultMembersResponse>;
    getVaultDataBreaches: (getVaultDataBreachData: string) => Promise<GetVaultDataBreachesResponse>;
    checkPasswordForBreach: (checkPasswordForBreachData: string) => Promise<GetVaultDataBreachesResponse>;
    dismissVaultDataBreach: (userOrganizaitonID: number, vaultID: number, vaultDataBreachID: number) => Promise<BaseResponse>;
    clearDataBreaches: (vaults: BreachRequestVault[]) => Promise<BaseResponse>;
}

export interface CreateOrganizationData
{
    name: string;
    addedVaults: UserVaultIDAndVaultID[];
    addedMembers: Member[];
}

export interface UpdateOrganizationData
{
    organizationID: number;
    name: string;
    unchangedVaults: UserVaultIDAndVaultID[];
    addedVaults: UserVaultIDAndVaultID[];
    removedVaults: UserVaultIDAndVaultID[];
    originalMembers: Member[];
    addedMembers: Member[];
    updatedMembers: Member[];
    removedMembers: Member[];
}

export interface OrganizationController
{
    getOrganizations: () => Promise<GetOrganizationsResponse>;
    createOrganization: (masterKey: string, createOrganizationData: string) => Promise<CreateOrganizationResponse>;
    updateOrganization: (masterKey: string, updateOrganizationData: string) => Promise<BaseResponse>;
    deleteOrganization: (organizationID: number) => Promise<BaseResponse>
}