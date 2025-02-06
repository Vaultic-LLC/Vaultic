import { Store, StoreState } from "./Base";
import { ComputedRef, Ref, computed, ref } from "vue";
import { api } from "../../API";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";
import { Member, Organization } from "@vaultic/shared/Types/DataTypes";
import { UserVaultIDAndVaultID } from "@vaultic/shared/Types/Entities";
import { CreateOrganizationData, UpdateOrganizationData } from "@vaultic/shared/Types/Controllers";
import app from "./AppStore";
import { Field } from "@vaultic/shared/Types/Fields";

export class OrganizationStore extends Store<StoreState>
{
    private internalFailedToRetrieveOrganizations: Ref<boolean>;
    private internalOrganizationsByID: Ref<Map<number, Organization>>;
    private internalOrganizationIDsByVaultIDs: Ref<Map<number, Set<number>>>;

    private internalOrganizations: ComputedRef<Organization[]>;
    private internalPinnedOrganizations: ComputedRef<Organization[]>;

    get failedToRetrieveOrganizations() { return this.internalFailedToRetrieveOrganizations.value; }
    get organizations() { return this.internalOrganizations; }
    get organizationsByID() { return this.internalOrganizationsByID.value; }
    get organizationIDsByVaultIDs() { return this.internalOrganizationIDsByVaultIDs.value; }
    get pinnedOrganizations() { return this.internalPinnedOrganizations.value; }

    constructor()
    {
        super('organizationStore');

        this.internalFailedToRetrieveOrganizations = ref(false);
        this.internalOrganizationsByID = ref(new Map());
        this.internalOrganizationIDsByVaultIDs = ref(new Map());

        this.internalOrganizations = computed(() => this.internalOrganizationsByID.value.valueArray());
        this.internalPinnedOrganizations = computed(() => this.internalOrganizations.value.filter(o => app.userPreferences.pinnedOrganizations.value.has(o.organizationID)));
    }

    public resetToDefault(): void
    {
        this.internalFailedToRetrieveOrganizations.value = false;
        this.internalOrganizationsByID.value = new Map();
        this.internalOrganizationIDsByVaultIDs.value = new Map();
    }

    protected defaultState()
    {
        return {
            version: new Field(0)
        }
    }

    async getOrganizations(): Promise<boolean>
    {
        if (!app.isOnline)
        {
            return false;
        }

        // reset so we don't have any duplicates
        this.resetToDefault();

        const response = await api.server.organization.getOrganizations();
        if (!response.Success)
        {
            this.internalFailedToRetrieveOrganizations.value = true;
            return false;
        }

        this.internalFailedToRetrieveOrganizations.value = false;
        response.OrganizationInfo?.forEach(o => 
        {
            const org: Organization =
            {
                organizationID: o.OrganizationID,
                name: o.Name,
                membersByUserID: new Map(),
                vaultIDsByVaultID: new Map()
            };

            o.VaultIDs.forEach(uv => 
            {
                org.vaultIDsByVaultID.set(uv, uv);

                if (!this.internalOrganizationIDsByVaultIDs.value.has(uv))
                {
                    this.internalOrganizationIDsByVaultIDs.value.set(uv, new Set());
                }

                this.internalOrganizationIDsByVaultIDs.value.get(uv)?.add(o.OrganizationID);
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

                org.membersByUserID.set(u.UserID, member)
            });

            this.internalOrganizationsByID.value.set(o.OrganizationID, org);
        });

        return true;
    }

    async createOrganization(masterKey: string, organization: Organization, addedVaults: UserVaultIDAndVaultID[], addedMembers: Member[]): Promise<boolean>
    {
        if (!app.isOnline)
        {
            return false;
        }

        const data: CreateOrganizationData =
        {
            name: organization.name,
            addedVaults,
            addedMembers
        };

        const response = await api.server.organization.createOrganization(masterKey, JSON.vaulticStringify(data));
        if (!response.Success)
        {
            defaultHandleFailedResponse(response);
            return false;
        }

        organization.organizationID = response.OrganizationID!;
        addedMembers.forEach(m =>
        {
            if (!organization.membersByUserID.has(m.userID))
            {
                organization.membersByUserID.set(m.userID, m);
            }
        });

        addedVaults.forEach(v => this.updateOrgsForVault(v.vaultID, [organization], []));
        this.organizationsByID.set(organization.organizationID, organization);

        return true;
    }

    async updateOrganization(masterKey: string, organization: Organization, unchangedVaults: UserVaultIDAndVaultID[], addedVaults: UserVaultIDAndVaultID[],
        removedVaults: UserVaultIDAndVaultID[], originalMembers: Member[], addedMembers: Member[], updatedMembers: Member[], removedMembers: Member[]): Promise<boolean>
    {
        if (!app.isOnline)
        {
            return false;
        }

        const updateOrganizationData: UpdateOrganizationData =
        {
            organizationID: organization.organizationID,
            name: organization.name,
            unchangedVaults,
            addedVaults,
            removedVaults,
            originalMembers,
            addedMembers,
            updatedMembers,
            removedMembers
        };

        const response = await api.server.organization.updateOrganization(masterKey, JSON.vaulticStringify(updateOrganizationData));
        if (!response.Success)
        {
            defaultHandleFailedResponse(response);
            return false;
        }

        const currentOrg = this.internalOrganizationsByID.value.get(organization.organizationID);
        if (currentOrg)
        {
            currentOrg.name = organization.name;
        }

        addedMembers.forEach(m => 
        {
            if (!organization.membersByUserID.has(m.userID))
            {
                organization.membersByUserID.set(m.userID, m);
            }
        });

        updatedMembers.forEach(m =>
        {
            if (organization.membersByUserID.has(m.userID))
            {
                organization.membersByUserID.get(m.userID)!.permission = m.permission;
            }
        });

        removedMembers.forEach(m => 
        {
            if (organization.membersByUserID.has(m.userID))
            {
                organization.membersByUserID.delete(m.userID);
            }
        });

        addedVaults.forEach(v => this.updateOrgsForVault(v.vaultID, [organization], []));
        removedVaults.forEach(v => this.updateOrgsForVault(v.vaultID, [], [organization]));

        return true;
    }

    updateOrgsForVault(vaultID: number, addedOrganizations: Organization[], removedOrganizations: Organization[])
    {
        const organizationByVaultID: Set<number> | undefined = this.internalOrganizationIDsByVaultIDs.value.get(vaultID);
        if (!organizationByVaultID)
        {
            const set: Set<number> = new Set();
            addedOrganizations.forEach(o => 
            {
                set.add(o.organizationID);
                const org = this.internalOrganizationsByID.value.get(o.organizationID);
                if (org)
                {
                    org.vaultIDsByVaultID.set(vaultID, vaultID);
                }
            });

            this.internalOrganizationIDsByVaultIDs.value.set(vaultID, set);
            return;
        }

        addedOrganizations.forEach(o => 
        {
            organizationByVaultID.add(o.organizationID);

            const org = this.internalOrganizationsByID.value.get(o.organizationID);
            if (org)
            {
                org.vaultIDsByVaultID.set(vaultID, vaultID);
            }
        });

        removedOrganizations.forEach(o => 
        {
            organizationByVaultID.delete(o.organizationID);

            const org = this.internalOrganizationsByID.value.get(o.organizationID);
            if (org)
            {
                org.vaultIDsByVaultID.delete(vaultID);
            }
        });
    }

    async deleteOrganization(id: number): Promise<boolean>
    {
        if (!app.isOnline)
        {
            return false;
        }

        const response = await api.server.organization.deleteOrganization(id);
        if (!response.Success)
        {
            return false;
        }

        if (this.internalOrganizationsByID.value.has(id))
        {
            const org = this.internalOrganizationsByID.value.get(id);
            if (!org)
            {
                return true;
            }

            org.vaultIDsByVaultID.forEach((v, k, map) =>
            {
                if (this.organizationIDsByVaultIDs.has(k))
                {
                    this.organizationIDsByVaultIDs.get(k)!.delete(id);
                }
            });

            this.internalOrganizationsByID.value.delete(id);
        }

        return true;
    }
}