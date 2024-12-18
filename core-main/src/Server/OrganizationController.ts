import { FinishLoginResponse, GetOrganizationsResponse } from "@vaultic/shared/Types/Responses";
import { AxiosHelper } from "./AxiosHelper";
import { OrganizationController } from "@vaultic/shared/Types/Controllers";
import { Member } from "@vaultic/shared/Types/DataTypes";
import { ModifiedOrgMember, VaultIDAndKey } from "@vaultic/shared/Types/ClientServerTypes";
import { environment } from "../Environment";

export function createOrganizationController(axiosHelper: AxiosHelper): OrganizationController
{
    function getOrganizations(): Promise<GetOrganizationsResponse>
    {
        return axiosHelper.sts.post('Organizations/GetOrganizations');
    }

    async function createOrganization(masterKey: string, name: string, userVaultIDsToShare: number[], addedMembers: Member[]): Promise<FinishLoginResponse>
    {
        const addedOrgMembers: ModifiedOrgMember[] = addedMembers.map(m => 
        {
            const mom: ModifiedOrgMember =
            {
                UserID: m.userID,
                Permission: m.permission,
                VaultIDAndKeys: []
            };

            return mom;
        });

        if (userVaultIDsToShare.length > 0)
        {
            const memberVaultIdAndKeys: Map<number, VaultIDAndKey[]> = new Map();
            const userVaultsAndKeys = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, userVaultIDsToShare);

            for (let i = 0; i < userVaultsAndKeys[0].length; i++)
            {
                for (let j = 0; j < addedMembers.length; j++)
                {
                    const response = await environment.utilities.crypt.ECEncrypt(addedMembers[j].publicKey, userVaultsAndKeys[1][i]);
                    if (!response.success)
                    {
                        return;
                    }

                    const vaultKey = JSON.vaulticStringify({
                        vaultKey: response.value.data,
                        publicKey: response.value.publicKey
                    });

                    const vaultIdAndKey: VaultIDAndKey =
                    {
                        VaultID: userVaultsAndKeys[0][i].vault.vaultID,
                        VaultKey: vaultKey
                    };

                    memberVaultIdAndKeys.get(addedMembers[j].userID).push(vaultIdAndKey);
                }
            }

            addedOrgMembers.forEach(m => 
            {
                m.VaultIDAndKeys = memberVaultIdAndKeys.get(m.UserID);
            });
        }

        return axiosHelper.sts.post('Organizations/CreateOrganization', {
            Name: name,
            AddedMembers: addedOrgMembers
        });
    }

    function updateOrganization(organizationID: number, name?: string, addedUserVaultIDsToShare?: number[],
        removedUserVaultIDsToShare?: number[], addedMembers?: Member[], updatedMembers?: Member[], removedMembers?: Member[])
    {


        return axiosHelper.sts.post('Organizations/UpdateOrganizaiton', {
            OrganizationID: organizationID,
            Name: name,
            AddedUserIDsAndPermissions: addedUserIDsAndPermissions,
            UpdatedUserIDsAndPermissions: updatedUserIDsAndPermission,
            RemovedUserIDsAndPermissions: removedUserIDsAndPermissions
        });
    }

    function deleteOrganization(organizationID: number)
    {
        return axiosHelper.sts.post('Organizations/DeleteOrganization', {
            OrganizationID: organizationID,
        });
    }

    return {
        getOrganizations,
        createOrganization,
        updateOrganization,
        deleteOrganization
    }
}
