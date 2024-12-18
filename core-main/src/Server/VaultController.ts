import { CreateVaultResponse, GetVaultDataResponse, BaseResponse, GetVaultMembersResponse } from "@vaultic/shared/Types/Responses";
import { AxiosHelper } from "./AxiosHelper";
import { ClientVaultController } from "@vaultic/shared/Types/Controllers";
import { AddedOrgInfo, ModifiedOrgMember, OrgAndUserKeys } from "@vaultic/shared/Types/ClientServerTypes";

export interface VaultController extends ClientVaultController
{
    create: (name: string, shared: boolean, addedOrgs: AddedOrgInfo, addedMembers: ModifiedOrgMember[]) => Promise<CreateVaultResponse>;
    getArchivedVaultData: (userOrganizationID: number, userVaultID: number) => Promise<GetVaultDataResponse>;
    unarchiveVault: (userOrganizationID: number, userVaultID: number) => Promise<GetVaultDataResponse>;
    failedToSaveVault: (userOrganizationID: number, userVaultID: number) => Promise<BaseResponse>;
}

export function createVaultController(axiosHelper: AxiosHelper)
{
    function create(name: string, shared: boolean, addedOrgs: AddedOrgInfo, addedMembers: ModifiedOrgMember[]): Promise<CreateVaultResponse>
    {
        return axiosHelper.api.post('Vault/Create', {
            Name: name,
            Shared: shared,
            AddedOrgs: addedOrgs,
            AddedMembers: addedMembers
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
        getMembers
    }
}
