import { FinishLoginResponse, GetOrganizationsResponse } from "@vaultic/shared/Types/Responses";
import { AxiosHelper } from "./AxiosHelper";
import { UserIDAndPermission } from "@vaultic/shared/Types/ClientServerTypes";
import { OrganizationController } from "@vaultic/shared/Types/Controllers";

export function createOrganizationController(axiosHelper: AxiosHelper): OrganizationController
{
    function getOrganizations(): Promise<GetOrganizationsResponse>
    {
        return axiosHelper.sts.post('Organizations/GetOrganizations');
    }

    function createOrganization(name: string, userIDsAndPermissions: UserIDAndPermission[]): Promise<FinishLoginResponse>
    {
        return axiosHelper.sts.post('Organizations/CreateOrganization', {
            Name: name,
            UserIDsAndPermissions: userIDsAndPermissions
        });
    }

    function updateOrganization(organizationID: number, name?: string, addedUserIDsAndPermissions?: UserIDAndPermission[],
        removedUserIDsAndPermissions?: UserIDAndPermission[])
    {
        return axiosHelper.sts.post('Organizations/UpdateOrganizaiton', {
            OrganizationID: organizationID,
            Name: name,
            AddedUserIDsAndPermissions: addedUserIDsAndPermissions,
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
