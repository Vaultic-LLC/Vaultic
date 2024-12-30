import { Store, StoreState } from "./Base";
import { ComputedRef, Ref, computed, ref } from "vue";
import { api } from "../../API";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";
import { Member, Organization } from "@vaultic/shared/Types/DataTypes";

export class OrganizationStore extends Store<StoreState>
{
    private internalFailedToRetrieveOrganizations: Ref<boolean>;
    private internalOrganizationsByID: Ref<Map<number, Organization>>;
    private internalOrganizationIDsByUserVaultID: Ref<Map<number, Set<number>>>;

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
        this.internalPinnedOrganizations = computed(() => []);
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
                    this.internalOrganizationIDsByUserVaultID.value.set(uv, new Set());
                }

                this.internalOrganizationIDsByUserVaultID.value.get(uv)?.add(o.OrganizationID);
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

    async createOrganization(masterKey: string, organization: Organization, addedVaults: number[], addedMembers: Member[]): Promise<boolean>
    {
        const response = await api.server.organization.createOrganization(masterKey, organization.name, addedVaults, addedMembers);
        if (!response.Success)
        {
            defaultHandleFailedResponse(response);
            return false;
        }

        addedMembers.forEach(m => 
        {
            if (!organization.members.has(m.userID))
            {
                organization.members.set(m.userID, m);
            }
        });

        addedVaults.forEach(v => this.updateOrgsForVault(v, [organization], []));
        return true;
    }

    async updateOrganization(masterKey: string, organization: Organization, addedVaults: number[], removedVaults: number[],
        originalMembers: Member[], addedMembers: Member[], updatedMembers: Member[], removedMembers: Member[]): Promise<boolean>
    {
        const response = await api.server.organization.updateOrganization(masterKey, organization.organizationID, organization.name, addedVaults, removedVaults,
            originalMembers, addedMembers, updatedMembers, removedMembers);

        if (!response.Success)
        {
            defaultHandleFailedResponse(response);
            return false;
        }

        addedMembers.forEach(m => 
        {
            if (!organization.members.has(m.userID))
            {
                organization.members.set(m.userID, m);
            }
        });

        updatedMembers.forEach(m =>
        {
            if (organization.members.has(m.userID))
            {
                organization.members.get(m.userID)!.permission = m.permission;
            }
        });

        removedMembers.forEach(m => 
        {
            if (organization.members.has(m.userID))
            {
                organization.members.delete(m.userID);
            }
        });

        addedVaults.forEach(v => this.updateOrgsForVault(v, [organization], []));
        removedVaults.forEach(v => this.updateOrgsForVault(v, [], [organization]));

        return true;
    }

    updateOrgsForVault(userVaultID: number, addedOrganizations: Organization[], removedOrganizations: Organization[])
    {
        const organizationsByUserVaultID: Set<number> | undefined = this.organizationIDsByUserVaultIDs.get(userVaultID);
        if (!organizationsByUserVaultID)
        {
            const set: Set<number> = new Set();
            addedOrganizations.forEach(o => set.add(o.organizationID));

            this.organizationIDsByUserVaultIDs.set(userVaultID, set);
            return;
        }

        addedOrganizations.forEach(o => organizationsByUserVaultID.add(o.organizationID));
        removedOrganizations.forEach(o => organizationsByUserVaultID.delete(o.organizationID));
    }

    async deleteOrganization(masterKey: string, id: number): Promise<boolean>
    {
        return true;
    }
}