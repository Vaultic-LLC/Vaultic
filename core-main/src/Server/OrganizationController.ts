import { BaseResponse, GetOrganizationsResponse } from "@vaultic/shared/Types/Responses";
import { AxiosHelper } from "./AxiosHelper";
import { OrganizationController } from "@vaultic/shared/Types/Controllers";
import { Member } from "@vaultic/shared/Types/DataTypes";
import { organizationUpdateAddedMembersToAddedOrgMembers, organizationUpdateAddedVaultsToAddedOrgMembers } from "../Helpers/MemberHelper";
import { AddedVaultInfo, ModifiedOrgMember, ServerPermissions } from "@vaultic/shared/Types/ClientServerTypes";
import { UserVaultIDAndVaultID } from "@vaultic/shared/Types/Entities";

export function createOrganizationController(axiosHelper: AxiosHelper): OrganizationController
{
    function getOrganizations(): Promise<GetOrganizationsResponse>
    {
        return axiosHelper.api.post('Organization/GetOrganizations');
    }

    async function createOrganization(masterKey: string, name: string, addedVaults: UserVaultIDAndVaultID[], addedMembers: Member[]): Promise<BaseResponse>
    {
        const addedOrgMembers = await organizationUpdateAddedMembersToAddedOrgMembers(masterKey, addedVaults.map(v => v.userVaultID), addedMembers);
        return axiosHelper.api.post('Organization/CreateOrganization', {
            Name: name,
            AddedVaults: addedOrgMembers[0],
            AddedMembers: addedOrgMembers[1]
        });
    }

    async function updateOrganization(masterKey: string, organizationID: number, name: string, addedVaults: UserVaultIDAndVaultID[],
        removedVaults: UserVaultIDAndVaultID[], originalMembers: Member[], addedMembers: Member[], updatedMembers: Member[],
        removedMembers: Member[]): Promise<BaseResponse>
    {
        let addedVaultModifiedOrgMembers: AddedVaultInfo;
        let removedVaultIDs: number[];
        let addedOrgMembers: [number[], ModifiedOrgMember[]];
        let updatedModifiedOrgMembers: ModifiedOrgMember[];
        let removedMemberIDs: number[];

        const addedUserVaultIDs = addedVaults.map(v => v.userVaultID);

        if (addedVaults.length > 0)
        {
            const allMembers = [...originalMembers, ...addedMembers];
            addedVaultModifiedOrgMembers = await organizationUpdateAddedVaultsToAddedOrgMembers(masterKey, addedUserVaultIDs, allMembers);
        }

        if (removedVaults.length > 0)
        {
            removedVaultIDs = removedVaults.map(v => v.vaultID);
        }

        if (addedMembers.length > 0)
        {
            addedOrgMembers = await organizationUpdateAddedMembersToAddedOrgMembers(masterKey, addedUserVaultIDs, addedMembers);
        }

        if (updatedMembers.length > 0)
        {
            updatedModifiedOrgMembers = updatedMembers.map(m =>
            {
                const modifiedOrgMember: ModifiedOrgMember =
                {
                    UserID: m.userID,
                    Permission: m.permission
                }

                return modifiedOrgMember;
            });
        }

        if (removedMembers.length > 0)
        {
            removedMemberIDs = removedMembers.map(m => m.userID);
        }
        // addedMembers have public keys so those are good
        // if there are any addedVautls, we need to get public keys for everyone in the org in order to add those vaults
        // to them
        // updatedMembers just needs to be turned into ModifiedOrgMembers with id and permissions
        // removed can just be sent as IDs

        // should only have to fetch public keys if there is an added vault

        return axiosHelper.api.post('Organization/UpdateOrganizaiton', {
            OrganizationID: organizationID,
            Name: name,
            AddedVaults: addedVaultModifiedOrgMembers,
            RemovedVaults: removedVaultIDs,
            AddedMembers: addedOrgMembers[1],
            UpdatedMembers: updatedModifiedOrgMembers,
            RemovedMembers: removedMemberIDs
        });
    }

    function deleteOrganization(organizationID: number)
    {
        return axiosHelper.sts.post('Organization/DeleteOrganization', {
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
