import { AllowSharingFrom, ModifiedOrgMember } from "./ClientServerTypes";
import { Member } from "./DataTypes";
import { UserVaultIDAndVaultID } from "./Entities";
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

export interface ClientVaultController 
{
    getMembers: (userOrganizationID: number, userVaultID: number) => Promise<GetVaultMembersResponse>;
}

export interface CreateOrganizationData
{
    name: string;
    addedVaults: UserVaultIDAndVaultID[];
    addedMembers: Member[];
}

export interface OrganizationController
{
    getOrganizations: () => Promise<GetOrganizationsResponse>;
    createOrganization: (masterKey: string, createOrganizationData: string) => Promise<BaseResponse>;
    updateOrganization: (masterKey: string, organizationID: number, name: string, addedVaults: UserVaultIDAndVaultID[], removedVaults: UserVaultIDAndVaultID[], originalMembers: Member[], addedMembers: Member[], updatedMembers: Member[], removedMembers: Member[]) => Promise<BaseResponse>;
    deleteOrganization: (organizationID: number) => Promise<BaseResponse>
}