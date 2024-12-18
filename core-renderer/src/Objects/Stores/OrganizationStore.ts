import { Store, StoreState } from "./Base";
import { ComputedRef, Ref, computed, ref } from "vue";
import { Organization } from "../../Types/DataTypes";
import { api } from "../../API";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";
import { Member } from "@vaultic/shared/Types/DataTypes";

export class OrganizationStore extends Store<StoreState>
{
    private internalFailedToRetrieveOrganizations: Ref<boolean>;
    private internalOrganizationsByID: Ref<Map<number, Organization>>;
    private internalOrganizationIDsByUserVaultID: Ref<Map<number, number[]>>;

    private internalOrganizations: ComputedRef<Organization[]>;
    private internalPinnedOrganizations: ComputedRef<Organization[]>;

    get failedToRetrieveOrganizations() { return this.state.failedToRetrieveOrganizations.value; }
    get organizations() { return this.internalOrganizations; }
    get organizationsByID() { return this.internalOrganizationsByID.value; }
    get organizationIDsByUserVaultIDs() { return this.internalOrganizationIDsByUserVaultID.value; }
    get pinnedOrganizations() { return this.internalPinnedOrganizations.value; }

    constructor()
    {
        super('organizationStore');

        this.internalFailedToRetrieveOrganizations = ref(false);
        this.internalOrganizationsByID = ref(new Map());
        this.internalOrganizationIDsByUserVaultID = ref(new Map());

        this.internalOrganizations = computed(() => this.internalOrganizationsByID.value.valueArray());

        // TODO: this may need to stay fielded since it will be saved in the user preferences store state =(
        // this.internalPinnedOrganizations = computed(() => [new Field({ id: new Field(""), name: new Field(""), members: new Field(new Map()) })]);
    }

    public resetToDefault(): void
    {
        this.internalFailedToRetrieveOrganizations.value = false;
        this.internalOrganizationsByID.value = new Map();
        this.internalOrganizationIDsByUserVaultID.value = new Map();
    }

    protected defaultState()
    {
        return {}
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

        this.state.failedToRetrieveOrganizations.value = false;
        if (!response.OrganizationsAndUsers)
        {
            return true;
        }

        response.OrganizationInfo?.forEach(o => 
        {
            const org: Organization =
            {
                organizationID: o.OrganizationID,
                name: o.Name,
                members: new Map(),
                userVaultIDs: new Map()
            };

            o.UserVaults.forEach(uv => 
            {
                org.userVaultIDs.set(uv, uv);

                if (!this.internalOrganizationIDsByUserVaultID.value.has(uv))
                {
                    this.internalOrganizationIDsByUserVaultID.value.set(uv, []);
                }

                this.internalOrganizationIDsByUserVaultID.value.get(uv)?.push(o.OrganizationID);
            });

            o.UserDemographics.forEach(u => 
            {
                const member: Member =
                {
                    userID: u.UserID,
                    firstName: u.FirstName,
                    lastName: u.LastName,
                    username: u.Username,
                    permission: u.Permissions,
                    icon: undefined,
                    publicKey: undefined
                };

                org.members.set(u.UserID, member)
            });

            this.internalOrganizationsByID.value.set(o.OrganizationID, org);
        });

        return true;
    }

    async createOrganization(organization: Organization, addedMembers: Member[]): Promise<boolean>
    {
        const response = await api.server.organization.createOrganization(organization.name, addedMembers);
        if (!response.Success)
        {
            defaultHandleFailedResponse(response);
            return false;
        }

        return true;
    }

    async updateOrganization(organization: Organization, addedMembers: Member[], updatedMembers: Member[],
        removedMembers: Member[]): Promise<boolean>
    {
        const response = await api.server.organization.updateOrganization(organization.organizationID,
            organization.name, addedMembers, updatedMembers, removedMembers);

        if (!response.Success)
        {
            defaultHandleFailedResponse(response);
            return false;
        }

        return true;
    }

    updateOrganizationsAfterVault(userVaultID: number, addedOrganizations: number[], removedOrganizations: number[])
    {

    }

    async deleteOrganization(masterKey: string, id: number): Promise<boolean>
    {
        return true;
    }
}