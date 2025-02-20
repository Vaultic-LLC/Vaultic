import { BaseResponse, CreateOrganizationResponse, GetOrganizationsResponse } from "@vaultic/shared/Types/Responses";
import { AxiosHelper } from "./AxiosHelper";
import { CreateOrganizationData, OrganizationController, UpdateOrganizationData } from "@vaultic/shared/Types/Controllers";
import { organizationUpdateAddedMembersToAddedOrgMembers, organizationUpdateAddedVaultsToAddedOrgMembers } from "../Helpers/MemberHelper";
import { AddedVaultInfo, ModifiedOrgMember } from "@vaultic/shared/Types/ClientServerTypes";
import { environment } from "../Environment";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { safetifyMethod } from "../Helpers/RepositoryHelper";

export function createOrganizationController(axiosHelper: AxiosHelper): OrganizationController
{
    function getOrganizations(): Promise<GetOrganizationsResponse>
    {
        return axiosHelper.api.post('Organization/GetOrganizations');
    }

    async function createOrganization(masterKey: string, createOrganizationData: string): Promise<TypedMethodResponse<CreateOrganizationResponse | undefined>>
    {
        return safetifyMethod(this, internalCreateOrganization);
        async function internalCreateOrganization(this: OrganizationController): Promise<TypedMethodResponse<CreateOrganizationResponse | undefined>>
        {
            const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
            if (!currentUser)
            {
                return TypedMethodResponse.fail();
            }

            const orgData: CreateOrganizationData = JSON.vaulticParse(createOrganizationData);
            const addedOrgMembers = await organizationUpdateAddedMembersToAddedOrgMembers(masterKey, currentUser.userID, currentUser.privateSigningKey,
                orgData.addedVaults.map(v => v.userVaultID), orgData.addedMembers);

            return TypedMethodResponse.success(await axiosHelper.api.post('Organization/CreateOrganization', {
                Name: orgData.name,
                AddedVaults: addedOrgMembers[0],
                AddedMembers: addedOrgMembers[1]
            }));
        }
    }

    async function updateOrganization(masterKey: string, updateOrganizationData: string): Promise<TypedMethodResponse<BaseResponse | undefined>>
    {
        return safetifyMethod(this, internalUpdateOrganization);
        async function internalUpdateOrganization(this: OrganizationController): Promise<TypedMethodResponse<BaseResponse | undefined>>
        {
            const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
            if (!currentUser)
            {
                return TypedMethodResponse.fail();
            }

            const parsedUpdatedOrgData: UpdateOrganizationData = JSON.vaulticParse(updateOrganizationData);

            let addedVaultModifiedOrgMembers: AddedVaultInfo;
            let removedVaultIDs: number[] = [];
            let addedOrgMembers: [number[], ModifiedOrgMember[]] = [[], []];
            let updatedModifiedOrgMembers: ModifiedOrgMember[] = [];
            let removedMemberIDs: number[] = [];

            if (parsedUpdatedOrgData.addedVaults.length > 0)
            {
                const allMembers = [...parsedUpdatedOrgData.originalMembers, ...parsedUpdatedOrgData.addedMembers];
                addedVaultModifiedOrgMembers = await organizationUpdateAddedVaultsToAddedOrgMembers(masterKey, currentUser.userID, currentUser.privateSigningKey,
                    parsedUpdatedOrgData.addedVaults.map(v => v.vaultID), allMembers);
            }

            if (parsedUpdatedOrgData.removedVaults.length > 0)
            {
                removedVaultIDs = parsedUpdatedOrgData.removedVaults.map(v => v.vaultID);
            }

            if (parsedUpdatedOrgData.addedMembers.length > 0)
            {
                addedOrgMembers = await organizationUpdateAddedMembersToAddedOrgMembers(masterKey, currentUser.userID, currentUser.privateSigningKey,
                    [...parsedUpdatedOrgData.addedVaults.map(v => v.userVaultID), ...parsedUpdatedOrgData.unchangedVaults.map(v => v.userVaultID)],
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

            return TypedMethodResponse.success(await axiosHelper.api.post('Organization/UpdateOrganizaiton', {
                OrganizationID: parsedUpdatedOrgData.organizationID,
                Name: parsedUpdatedOrgData.name,
                AddedVaults: addedVaultModifiedOrgMembers,
                RemovedVaults: removedVaultIDs,
                AddedMembers: addedOrgMembers[1],
                UpdatedMembers: updatedModifiedOrgMembers,
                RemovedMembers: removedMemberIDs
            }));
        }
    }

    function deleteOrganization(organizationID: number)
    {
        return axiosHelper.api.post('Organization/DeleteOrganization', {
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
