import { CreateVaultResponse, GetVaultDataResponse, BaseResponse, GetVaultMembersResponse } from "@vaultic/shared/Types/Responses";
import { AxiosHelper } from "./AxiosHelper";
import { ClientVaultController } from "@vaultic/shared/Types/Controllers";
import { AddedOrgInfo, AddedVaultMembersInfo, ModifiedOrgMember } from "@vaultic/shared/Types/ClientServerTypes";

export interface VaultController extends ClientVaultController
{
    create: (name: string, shared: boolean, addedOrgs: AddedOrgInfo, addedMembers: AddedVaultMembersInfo) => Promise<CreateVaultResponse>;
    updateVault: (userVaultID: number, userOrganizationID: number, shared: boolean, addedOrganizations: AddedOrgInfo, removedOrganizations: number[], addedMembers: AddedVaultMembersInfo, updatedMembers: ModifiedOrgMember[], removedMembers: number[]) => Promise<BaseResponse>;
    getArchivedVaultData: (userOrganizationID: number, userVaultID: number) => Promise<GetVaultDataResponse>;
    unarchiveVault: (userOrganizationID: number, userVaultID: number) => Promise<GetVaultDataResponse>;
    failedToSaveVault: (userOrganizationID: number, userVaultID: number) => Promise<BaseResponse>;
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
        return axiosHelper.api.post('Vault/Create', {
            UserVaultID: userVaultID,
            UserOrganizationID: userOrganizationID,
            Shared: shared,
            AddedOrgs: addedOrganizations,
            RemovedOrg: removedOrganizations,
            AddedMembers: addedMembers,
            UpdatedMembers: updatedMembers,
            RemovedMembers: removedMembers
        });
    }

    // TODO: these need to also pass back the organizationID on the userVault record
    function getArchivedVaultData(userOrganizationID: number, userVaultID: number): Promise<GetVaultDataResponse>
    {
        return axiosHelper.api.post('Vault/GetArchivedVaultData', {
            UserOrganizationID: userOrganizationID,
            UserVaultID: userVaultID
        });
    }

    function unarchiveVault(userOrganizationID: number, userVaultID: number): Promise<GetVaultDataResponse>
    {
        return axiosHelper.api.post('Vault/UnarchiveVault', {
            UserOrganizationID: userOrganizationID,
            UserVaultID: userVaultID
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

    function getMembers(userOrganizationID: number, userVaultID: number): Promise<GetVaultMembersResponse>
    {
        return axiosHelper.api.post('Vault/FailedToSaveVault', {
            UserOrganizationID: userOrganizationID,
            UserVaultID: userVaultID
        });
    }

    return {
        create,
        getArchivedVaultData,
        unarchiveVault,
        deleteVault,
        failedToSaveVault,
        getMembers,
        updateVault
    }
}
