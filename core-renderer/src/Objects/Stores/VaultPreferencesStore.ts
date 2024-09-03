import { Dictionary } from "../../Types/DataStructures";
import StoreUpdateTransaction, { Entity } from "../StoreUpdateTransaction";
import { VaultContrainedStore } from "./Base";

export interface VaultPreferencesState
{
    pinnedFilters: Dictionary<any>;
    pinnedGroups: Dictionary<any>;
    pinnedPasswords: Dictionary<any>;
    pinnedValues: Dictionary<any>;
}

export class VaultPreferencesStore extends VaultContrainedStore<VaultPreferencesState>
{
    get pinnedFilters() { return this.state.pinnedFilters; }
    get pinnedGroups() { return this.state.pinnedGroups; }
    get pinnedPasswords() { return this.state.pinnedPasswords; }
    get pinnedValues() { return this.state.pinnedValues; }

    constructor(vault)
    {
        super(vault, "vaultPreferencesStore");
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

    private async update()
    {
        const transaction = new StoreUpdateTransaction(Entity.UserVault, this.vault.userVaultID);
        transaction.addStore(this, this.state);

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