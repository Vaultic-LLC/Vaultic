import { validateObject } from "../../Helpers/TypeScriptHelper";
import { Dictionary } from "../../Types/DataStructures";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { VaultContrainedStore } from "./Base";

export interface VaultPreferencesState
{
    pinnedFilters: Dictionary<any>;
    pinnedGroups: Dictionary<any>;
    pinnedPasswords: Dictionary<any>;
    pinnedValues: Dictionary<any>;
}

// just used for validation
const emptyVaultPreferncesState: VaultPreferencesState =
{
    pinnedFilters: {},
    pinnedGroups: {},
    pinnedPasswords: {},
    pinnedValues: {}
};

export class VaultPreferencesStore extends VaultContrainedStore<VaultPreferencesState>
{
    get pinnedFilters() { return this.state.pinnedFilters; }
    get pinnedGroups() { return this.state.pinnedGroups; }
    get pinnedPasswords() { return this.state.pinnedPasswords; }
    get pinnedValues() { return this.state.pinnedValues; }

    constructor(vault)
    {
        super(vault, "vaultPreferencesStoreState");
    }

    protected defaultState(): VaultPreferencesState
    {
        return {
            pinnedFilters: {},
            pinnedGroups: {},
            pinnedPasswords: {},
            pinnedValues: {}
        }
    }

    public updateState(state: VaultPreferencesState): void 
    {
        let stateToUse = state;
        if (!validateObject(stateToUse, emptyVaultPreferncesState, undefined, keyIsGuid))
        {
            stateToUse = this.defaultState();
        }

        super.updateState(stateToUse);

        function keyIsGuid(propName: string, _: any)
        {
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(propName);
        }
    }

    private async update()
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        transaction.updateUserVaultStore(this, this.state);

        await transaction.commit('');
    }

    public async addPinnedFilter(id: string)
    {
        this.state.pinnedFilters[id] = {};
        await this.update();
    }

    public async removePinnedFilters(id: string)
    {
        delete this.state.pinnedFilters[id];
        await this.update();
    }

    public async addPinnedGroup(id: string)
    {
        this.state.pinnedGroups[id] = {};
        await this.update();
    }

    public async removePinnedGroups(id: string)
    {
        delete this.state.pinnedGroups[id];
        await this.update();
    }

    public async addPinnedPassword(id: string)
    {
        this.state.pinnedPasswords[id] = {};
        await this.update();
    }

    public async removePinnedPasswords(id: string)
    {
        delete this.state.pinnedPasswords[id];
        await this.update();
    }

    public async addPinnedValue(id: string)
    {
        this.state.pinnedValues[id] = {};
        await this.update();
    }

    public async removePinnedValues(id: string)
    {
        delete this.state.pinnedValues[id];
        await this.update();
    }
}