import { Store, StoreState } from "./Base";
import { Field } from "@vaultic/shared/Types/Fields";
import { ComputedRef, computed } from "vue";
import { Member, Organization } from "../../Types/DataTypes";
import { api } from "../../API";
import { UserIDAndPermission } from "@vaultic/shared/Types/ClientServerTypes";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";

export interface OrganizationStoreState extends StoreState
{
    organizations: Field<Map<number, Field<Organization>>>;
    failedToRetrieveOrganizations: Field<boolean>;
}

export class OrganizationStore extends Store<OrganizationStoreState>
{
    private internalPinnedOrganizations: ComputedRef<Field<Organization>[]>;

    get failedToRetrieveOrganizations() { return this.state.failedToRetrieveOrganizations.value; }
    get organizations() { return this.state.organizations; }
    get pinnedOrganizations() { return this.internalPinnedOrganizations.value; }

    constructor()
    {
        super('organizationStore');

        this.internalPinnedOrganizations = computed(() => [new Field({ id: new Field(""), name: new Field(""), members: new Field(new Map()) })]);
    }

    protected defaultState()
    {
        return {
            organizations: new Field(new Map()),
            failedToRetrieveOrganizations: new Field(false)
        }
    }

    async getOrganizations(): Promise<boolean>
    {
        // reset so we don't have any duplicates
        this.updateState(this.defaultState());

        const response = await api.server.organization.getOrganizations();
        if (!response.Success)
        {
            this.state.failedToRetrieveOrganizations.value = true;
            return false;
        }

        response.OrganizationsAndUsers?.forEach(o => 
        {
            const org: Organization =
            {
                id: new Field(''),
                organizationID: new Field(o.OrganizationID),
                name: new Field(o.Name),
                members: new Field(new Map())
            };

            o.UserDemographics.forEach(u => 
            {
                const member: Member =
                {
                    id: new Field(u.UserID.toString()),
                    userID: new Field(u.UserID),
                    firstName: new Field(u.FirstName),
                    lastName: new Field(u.LastName),
                    username: new Field(u.Username),
                    icon: new Field(''),
                    permission: new Field(u.Permissions)
                };

                org.members.value.set(u.UserID, new Field(member))
            });

            this.state.organizations.value.set(o.OrganizationID, new Field(org));
        });

        return true;
    }

    async createOrganization(organization: Organization): Promise<boolean>
    {
        const userIDsAndPermissions: UserIDAndPermission[] = organization.members.value.map((k, v) => 
        {
            const userIDAndPermission: UserIDAndPermission =
            {
                UserID: v.value.userID.value,
                Permission: v.value.permission.value
            };

            return userIDAndPermission;
        });

        const response = await api.server.organization.createOrganization(organization.name.value, userIDsAndPermissions);
        if (!response.Success)
        {
            defaultHandleFailedResponse(response);
            return false;
        }

        return true;
    }

    async updateOrganization(organization: Organization): Promise<boolean>
    {
        return true;
    }

    async deleteOrganization(masterKey: string, id: number): Promise<boolean>
    {
        return true;
    }
}