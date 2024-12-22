import { BaseResponse, FinishLoginResponse, GetOrganizationsResponse } from "@vaultic/shared/Types/Responses";
import { AxiosHelper } from "./AxiosHelper";
import { OrganizationController } from "@vaultic/shared/Types/Controllers";
import { Member } from "@vaultic/shared/Types/DataTypes";
import { organizationUpdateAddedMembersToAddedOrgMembers, organizationUpdateAddedVaultsToAddedOrgMembers } from "../Helpers/MemberHelper";
import { AddedVaultInfo, ModifiedOrgMember } from "@vaultic/shared/Types/ClientServerTypes";
import { environment } from "../Environment";

export function createOrganizationController(axiosHelper: AxiosHelper): OrganizationController
{
    function getOrganizations(): Promise<GetOrganizationsResponse>
    {
        return axiosHelper.api.post('Organizations/GetOrganizations');
    }

    async function createOrganization(masterKey: string, name: string, addedVaults: number[], addedMembers: Member[]): Promise<BaseResponse>
    {
        const addedOrgMembers = await organizationUpdateAddedMembersToAddedOrgMembers(masterKey, addedVaults, addedMembers);
        return axiosHelper.api.post('Organizations/CreateOrganization', {
            Name: name,
            AddedMembers: addedOrgMembers
        });
    }

    async function updateOrganization(masterKey: string, organizationID: number, name: string, addedVaults: number[],
        removedUserVaultID: number[], originalMembers: Member[], addedMembers: Member[], updatedMembers: Member[],
        removedMembers: Member[]): Promise<BaseResponse>
    {
        let addedVaultModifiedOrgMembers: AddedVaultInfo;
        let removedVaultIDs: number[];
        let addedOrgMembers: ModifiedOrgMember[];
        let updatedModifiedOrgMembers: ModifiedOrgMember[];
        let removedMemberIDs: number[];

        if (addedVaults.length > 0)
        {
            const allMembers = [...originalMembers, ...addedMembers];
            addedVaultModifiedOrgMembers = await organizationUpdateAddedVaultsToAddedOrgMembers(masterKey, addedVaults, allMembers);
        }

        if (removedUserVaultID.length > 0)
        {
            const vaultData = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, removedUserVaultID);
            vaultData[0].forEach(v => removedVaultIDs.push(v.vaultID));
        }

        if (addedMembers.length > 0)
        {
            addedOrgMembers = await organizationUpdateAddedMembersToAddedOrgMembers(masterKey, addedVaults, addedMembers);
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

        return axiosHelper.api.post('Organizations/UpdateOrganizaiton', {
            OrganizationID: organizationID,
            Name: name,
            AddedVaults: addedVaultModifiedOrgMembers,
            RemovedVaults: removedVaultIDs,
            AddedMembers: addedOrgMembers,
            UpdatedMembers: updatedModifiedOrgMembers,
            RemovedMembers: removedMemberIDs
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
