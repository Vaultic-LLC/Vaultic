import { CreateVaultResponse, GetVaultDataResponse, BaseResponse, GetVaultMembersResponse, GetVaultDataBreachesResponse, SyncVaultsResponse } from "@vaultic/shared/Types/Responses";
import { AxiosHelper } from "./AxiosHelper";
import { ClientVaultController } from "@vaultic/shared/Types/Controllers";
import { AddedOrgInfo, AddedVaultMembersInfo, ModifiedOrgMember, UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";
import { BreachRequestVault } from "@vaultic/shared/Types/DataTypes";

export interface VaultController extends ClientVaultController
{
    create: (name: string, shared: boolean, addedOrgs: AddedOrgInfo, addedMembers: AddedVaultMembersInfo) => Promise<CreateVaultResponse>;
    updateVault: (userVaultID: number, userOrganizationID: number, shared: boolean, addedOrganizations: AddedOrgInfo, removedOrganizations: number[], addedMembers: AddedVaultMembersInfo, updatedMembers: ModifiedOrgMember[], removedMembers: number[]) => Promise<BaseResponse>;
    failedToSaveVault: (userOrganizationID: number, userVaultID: number) => Promise<BaseResponse>;
    deleteVault: (userOrganizationID: number, userVaultID: number) => Promise<BaseResponse>;
    syncVaults: (userDataPayload: UserDataPayload) => Promise<SyncVaultsResponse>;
}

export function createVaultController(axiosHelper: AxiosHelper)
{
    function create(name: string, shared: boolean, addedOrgs: AddedOrgInfo, addedMembers: AddedVaultMembersInfo): Promise<CreateVaultResponse>
    {
        return axiosHelper.api.post('Vault/Create', {
            Name: name,
            Shared: shared,
            AddedOrgs: addedOrgs,
            AddedMembers: addedMembers
        });
    }

    function updateVault(userVaultID: number, userOrganizationID: number, shared: boolean, addedOrganizations: AddedOrgInfo,
        removedOrganizations: number[], addedMembers: AddedVaultMembersInfo, updatedMembers: ModifiedOrgMember[], removedMembers: number[]):
        Promise<BaseResponse>
    {
        return axiosHelper.api.post('Vault/UpdateVault', {
            UserVaultID: userVaultID,
            UserOrganizationID: userOrganizationID,
            Shared: shared,
            AddedOrgs: addedOrganizations,
            RemovedOrgs: removedOrganizations,
            AddedMembers: addedMembers,
            UpdatedMembers: updatedMembers,
            RemovedMembers: removedMembers
        });
    }

    function deleteVault(userOrganizationID: number, userVaultID: number): Promise<GetVaultDataResponse>
    {
        return axiosHelper.api.post('Vault/DeleteVault', {
            UserOrganizationID: userOrganizationID,
            UserVaultID: userVaultID
        });
    }

    function failedToSaveVault(userOrganizationID: number, userVaultID: number): Promise<BaseResponse>
    {
        return axiosHelper.api.post('Vault/FailedToSaveVault', {
            UserOrganizationID: userOrganizationID,
            UserVaultID: userVaultID
        });
    }

    function getMembers(userOrganizationID: number, vaultID: number): Promise<GetVaultMembersResponse>
    {
        return axiosHelper.api.post('Vault/GetMembers', {
            UserOrganizationID: userOrganizationID,
            VaultID: vaultID
        });
    }

    function getVaultDataBreaches(getVaultDataBreachesData: string): Promise<GetVaultDataBreachesResponse>
    {
        return axiosHelper.api.post("Vault/GetVaultDataBreaches", getVaultDataBreachesData);
    }

    function checkPasswordsForBreach(checkPasswordForBreachData: string): Promise<GetVaultDataBreachesResponse>
    {
        return axiosHelper.api.post("Vault/CheckPasswordsForBreach", checkPasswordForBreachData);
    }

    function dismissVaultDataBreach(userOrganizaitonID: number, vaultID: number, vaultDataBreachID: number): Promise<BaseResponse>
    {
        return axiosHelper.api.post("Vault/DismissVaultDataBreach", {
            UserOrganizationID: userOrganizaitonID,
            VaultID: vaultID,
            VaultDataBreachID: vaultDataBreachID
        });
    }

    function clearDataBreaches(vaults: BreachRequestVault[]): Promise<BaseResponse>
    {
        return axiosHelper.api.post("Vault/ClearDataBreaches", {
            Vaults: vaults
        });
    }

    function syncVaults(userDataPayload: UserDataPayload): Promise<SyncVaultsResponse>
    {
        return axiosHelper.api.post("Vault/SyncVaults", {
            UserDataPayload: userDataPayload
        });
    }

    return {
        create,
        deleteVault,
        failedToSaveVault,
        getMembers,
        updateVault,
        getVaultDataBreaches,
        checkPasswordsForBreach,
        dismissVaultDataBreach,
        clearDataBreaches,
        syncVaults
    }
}
