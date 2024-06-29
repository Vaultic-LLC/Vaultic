import { ColorPalette, colorPalettes, emptyColorPalette } from "../../Types/Colors";
import { Store, StoreState } from "./Base";
import { DataFile } from "../../Types/EncryptedData";
import fileHelper from "../../Helpers/fileHelper";
import { Ref, ref, watch } from "vue";
import { DataType } from "../../Types/Table";
import { Stores, stores } from ".";
import { Dictionary } from "../../Types/DataStructures";
import { api } from "../../API"
import StoreUpdateTransaction from "../StoreUpdateTransaction";

export interface UserPreferencesStoreState extends StoreState
{
    currentColorPalette: ColorPalette;
    pinnedFilters: Dictionary<any>;
    pinnedGroups: Dictionary<any>;
    pinnedPasswords: Dictionary<any>;
    pinnedValues: Dictionary<any>;
}

class UserPreferenceStore extends Store<UserPreferencesStoreState>
{
    private internalCurrentPrimaryColor: Ref<string>;

    get currentColorPalette() { return this.state.currentColorPalette; }
    set currentColorPalette(value: ColorPalette) { this.state.currentColorPalette = value; }
    get currentPrimaryColor() { return this.internalCurrentPrimaryColor }
    get pinnedFilters() { return this.state.pinnedFilters; }
    get pinnedGroups() { return this.state.pinnedGroups; }
    get pinnedPasswords() { return this.state.pinnedPasswords; }
    get pinnedValues() { return this.state.pinnedValues; }

    constructor()
    {
        super();

        this.internalCurrentPrimaryColor = ref('');
        this.setCurrentPrimaryColor(DataType.Passwords);
    }

    public init(stores: Stores)
    {
        watch(() => this.state.currentColorPalette, () =>
        {
            this.setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable);
        });

        watch(() => stores.appStore.activePasswordValuesTable, (newValue) =>
        {
            this.setCurrentPrimaryColor(newValue);
        });

        this.setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable);
    }

    protected defaultState(): UserPreferencesStoreState
    {
        return {
            version: 0,
            currentColorPalette: colorPalettes[0],
            pinnedFilters: {},
            pinnedGroups: {},
            pinnedPasswords: {},
            pinnedValues: {}
        };
    }

    public getFile(): DataFile
    {
        return api.files.userPreferences;
    }

    public encrypted(): boolean
    {
        return false;
    }

    public async readState(_: string)
    {
        if (this.loadedFile)
        {
            return true;
        }

        if (!(await api.files.userPreferences.exists()))
        {
            return true;
        }

        const [succeeded, state] = await fileHelper.readUnencrypted<UserPreferencesStoreState>(this.getFile());
        if (!succeeded)
        {
            return false;
        }

        this.loadedFile = true;
        Object.assign(this.state, state);
        this.postAssignState(state);
        this.events['onChanged']?.forEach(f => f());

        return true;
    }

    // public async writeState(_: string): Promise<boolean>
    // {
    //     this.state.version += 1;

    //     const success = await fileHelper.writeUnencrypted<UserPreferencesStoreState>(this.state, this.getFile());
    //     if (!success)
    //     {
    //         return false;
    //     }

    //     if (!stores.appStore.isOnline)
    //     {
    //         return true;
    //     }

    //     const data =
    //     {
    //         UserPreferencesStoreState: this.state
    //     };

    //     const response = await api.server.user.backupUserPreferences(JSON.stringify(data));
    //     if (!response.Success)
    //     {
    //         defaultHandleFailedResponse(response, false);
    //     }

    //     return response.Success;
    // }

    private async update()
    {
        const transaction = new StoreUpdateTransaction();
        transaction.addStore(this, this.state);

        await transaction.commit('');
    }

    private setCurrentPrimaryColor(dataType: DataType)
    {
        switch (dataType)
        {
            case DataType.NameValuePairs:
                this.currentPrimaryColor.value = this.state.currentColorPalette.valuesColor.primaryColor;
                break;
            case DataType.Passwords:
            default:
                this.currentPrimaryColor.value = this.state.currentColorPalette.passwordsColor.primaryColor;
        }
    }

    public async updateAndCommitCurrentColorPalette(colorPalette: ColorPalette)
    {
        const transaction = new StoreUpdateTransaction();
        this.updateCurrentColorPalette(transaction, colorPalette);

        transaction.commit('');
    }

    public async updateCurrentColorPalette(transaction: StoreUpdateTransaction, colorPalette: ColorPalette)
    {
        const pendingState = this.cloneState();
        // TODO: remove comment
        // This is needed for tracking to work. Otherwise some things won't register that the color palette has changed
        // this.state.currentColorPalette = emptyColorPalette;
        pendingState.currentColorPalette = colorPalette;

        transaction.addStore(this, pendingState, () => this.setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable))
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

const userPreferenceStore = new UserPreferenceStore();
export default userPreferenceStore;
export type UserPreferenceStoreType = typeof userPreferenceStore;
