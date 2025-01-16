import { BaseResponse, GetOrganizationsResponse } from "@vaultic/shared/Types/Responses";
import { AxiosHelper } from "./AxiosHelper";
import { CreateOrganizationData, OrganizationController, UpdateOrganizationData } from "@vaultic/shared/Types/Controllers";
import { organizationUpdateAddedMembersToAddedOrgMembers, organizationUpdateAddedVaultsToAddedOrgMembers } from "../Helpers/MemberHelper";
import { AddedVaultInfo, ModifiedOrgMember } from "@vaultic/shared/Types/ClientServerTypes";

export function createOrganizationController(axiosHelper: AxiosHelper): OrganizationController
{
    function getOrganizations(): Promise<GetOrganizationsResponse>
    {
        return axiosHelper.api.post('Organization/GetOrganizations');
    }

    async function createOrganization(masterKey: string, createOrganizationData: string): Promise<BaseResponse>
    {
        const orgData: CreateOrganizationData = JSON.vaulticParse(createOrganizationData);
        const addedOrgMembers = await organizationUpdateAddedMembersToAddedOrgMembers(masterKey, orgData.addedVaults.map(v => v.userVaultID), orgData.addedMembers);

        return axiosHelper.api.post('Organization/CreateOrganization', {
            Name: orgData.name,
            AddedVaults: addedOrgMembers[0],
            AddedMembers: addedOrgMembers[1]
        });
    }

    async function updateOrganization(masterKey: string, updateOrganizationData: string): Promise<BaseResponse>
    {
        const parsedUpdatedOrgData: UpdateOrganizationData = JSON.vaulticParse(updateOrganizationData);

        let addedVaultModifiedOrgMembers: AddedVaultInfo;
        let removedVaultIDs: number[] = [];
        let addedOrgMembers: [number[], ModifiedOrgMember[]] = [[], []];
        let updatedModifiedOrgMembers: ModifiedOrgMember[] = [];
        let removedMemberIDs: number[] = [];

        const addedUserVaultIDs = parsedUpdatedOrgData.addedVaults.map(v => v.userVaultID);

        if (parsedUpdatedOrgData.addedVaults.length > 0)
        {
            const allMembers = [...parsedUpdatedOrgData.originalMembers, ...parsedUpdatedOrgData.addedMembers];
            addedVaultModifiedOrgMembers = await organizationUpdateAddedVaultsToAddedOrgMembers(masterKey, addedUserVaultIDs, allMembers);
        }

        if (parsedUpdatedOrgData.removedVaults.length > 0)
        {
            removedVaultIDs = parsedUpdatedOrgData.removedVaults.map(v => v.vaultID);
        }

        if (parsedUpdatedOrgData.addedMembers.length > 0)
        {
            addedOrgMembers = await organizationUpdateAddedMembersToAddedOrgMembers(masterKey, [...addedUserVaultIDs, ...parsedUpdatedOrgData.unchangedVaults.map(v => v.userVaultID)],
                parsedUpdatedOrgData.addedMembers);
        }

        if (parsedUpdatedOrgData.updatedMembers.length > 0)
        {
            updatedModifiedOrgMembers = parsedUpdatedOrgData.updatedMembers.map(m =>
            {
                const modifiedOrgMember: ModifiedOrgMember =
                {
                    UserID: m.userID,
                    Permissions: m.permission
                }

                return modifiedOrgMember;
            });
        }

        if (parsedUpdatedOrgData.removedMembers.length > 0)
        {
            removedMemberIDs = parsedUpdatedOrgData.removedMembers.map(m => m.userID);
        }
        // addedMembers have public keys so those are good
        // if there are any addedVautls, we need to get public keys for everyone in the org in order to add those vaults
        // to them
        // updatedMembers just needs to be turned into ModifiedOrgMembers with id and permissions
        // removed can just be sent as IDs

        // should only have to fetch public keys if there is an added vault

        return axiosHelper.api.post('Organization/UpdateOrganizaiton', {
            OrganizationID: parsedUpdatedOrgData.organizationID,
            Name: parsedUpdatedOrgData.name,
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
