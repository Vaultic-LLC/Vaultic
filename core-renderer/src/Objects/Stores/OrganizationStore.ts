import { Store, StoreState } from "./Base";
import { ClientDevice, Device } from "@vaultic/shared/Types/Device";
import { Field } from "@vaultic/shared/Types/Fields";
import { api } from "../../API";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";
import { ComputedRef, computed } from "vue";
import app from "./AppStore";
import { Organization } from "../../Types/DataTypes";

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
        return true;
    }

    async deleteOrganization(masterKey: string, id: number): Promise<boolean>
    {
        return true;
    }
}