import { ColorPalette, colorPalettes, emptyColorPalette } from "../../Types/Colors";
import { Store } from "./Base";
import { Ref, ref, watch } from "vue";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { api } from "../../API";
import app, { AppStore } from "./AppStore";
import { validateObject } from "../../Helpers/TypeScriptHelper";
import { isHexString } from "../../Helpers/ColorHelper";
import { DataType } from "../../Types/DataTypes";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";

export interface PinnedDataTypes 
{
    [key: string]: any;
    pinnedFilters: Dictionary<any>;
    pinnedGroups: Dictionary<any>;
    pinnedPasswords: Dictionary<any>;
    pinnedValues: Dictionary<any>;
}

// just used for validation
const emptyDataTypes: PinnedDataTypes =
{
    pinnedFilters: {},
    pinnedGroups: {},
    pinnedPasswords: {},
    pinnedValues: {}
};

export interface UserPreferencesStoreState
{
    currentColorPalette: ColorPalette;
    // keyed by userVaultID
    pinnedDataTypes: Dictionary<PinnedDataTypes>;
}

export class UserPreferencesStore extends Store<UserPreferencesStoreState>
{
    private internalCurrentPrimaryColor: Ref<string>;

    get currentColorPalette() { return this.state.currentColorPalette; }
    set currentColorPalette(value: ColorPalette) { this.state.currentColorPalette = value; }
    get currentPrimaryColor() { return this.internalCurrentPrimaryColor }

    get pinnedFilters() { return this.state.pinnedDataTypes[app.currentVault.userVaultID]?.pinnedFilters ?? {}; }
    get pinnedGroups() { return this.state.pinnedDataTypes[app.currentVault.userVaultID]?.pinnedGroups ?? {}; }
    get pinnedPasswords() { return this.state.pinnedDataTypes[app.currentVault.userVaultID]?.pinnedPasswords ?? {}; }
    get pinnedValues() { return this.state.pinnedDataTypes[app.currentVault.userVaultID]?.pinnedValues ?? {}; }

    constructor(appStore: AppStore)
    {
        super("userPreferencesStoreState");

        this.internalCurrentPrimaryColor = ref('');
        this.setCurrentPrimaryColor(DataType.Passwords);

        this.init(appStore)
    }

    public updateState(state: UserPreferencesStoreState): void 
    {
        let stateToUse = state;
        if (!stateToUse.currentColorPalette || !stateToUse.pinnedDataTypes)
        {
            stateToUse = this.defaultState();
        }
        else 
        {
            if (!validateObject(stateToUse.currentColorPalette, emptyColorPalette, testProperty) ||
                !validateObject(stateToUse.pinnedDataTypes, emptyDataTypes, undefined, keyIsGuid))
            {
                stateToUse = this.defaultState();
            }

        }

        super.updateState(stateToUse);

        function testProperty(propName: string, propValue: string): boolean
        {
            if (propName == 'id')
            {
                return typeof propValue == "number";
            }
            else if (propName == 'active' || propName == 'isCreated' || propName == 'editable')
            {
                return typeof propValue == 'boolean';
            }
            else 
            {
                return isHexString(propValue);
            }
        }

        function keyIsGuid(objName: string, propName: string, _: any)
        {
            if (objName == nameof<PinnedDataTypes>("pinnedFilters") ||
                objName == nameof<PinnedDataTypes>("pinnedGroups") ||
                objName == nameof<PinnedDataTypes>("pinnedPasswords") ||
                objName == nameof<PinnedDataTypes>("pinnedValues"))
            {
                return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(propName);
            }

            return true;
        }
    }

    public init(appStore: AppStore)
    {
        watch(() => this.state.currentColorPalette, () =>
        {
            this.setCurrentPrimaryColor(appStore.activePasswordValuesTable);
        });

        watch(() => appStore.activePasswordValuesTable, (newValue) =>
        {
            this.setCurrentPrimaryColor(newValue);
        });

        watch(() => appStore.currentVault.userVaultID, (newValue) => 
        {
            if (!this.state.pinnedDataTypes[newValue])
            {
                this.state.pinnedDataTypes[newValue] =
                {
                    pinnedFilters: {},
                    pinnedGroups: {},
                    pinnedPasswords: {},
                    pinnedValues: {}
                };
            }
        });

        this.setCurrentPrimaryColor(appStore.activePasswordValuesTable);
    }

    protected defaultState(): UserPreferencesStoreState
    {
        return {
            currentColorPalette: colorPalettes[0],
            pinnedDataTypes: {}
        };
    }

    public async loadLastUsersPreferences()
    {
        const state = await api.repositories.users.getLastUsedUserPreferences();
        if (state)
        {
            const parsedState: UserPreferencesStoreState = JSON.vaulticParse(state);
            if (parsedState.currentColorPalette)
            {
                Object.assign(this.state, parsedState);
            }
        }
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

        await transaction.commit('');
    }

    public async updateCurrentColorPalette(transaction: StoreUpdateTransaction, colorPalette: ColorPalette)
    {
        // Update the state right away so there is no potential delay for themeing
        this.state.currentColorPalette = colorPalette;
        this.setCurrentPrimaryColor(app.activePasswordValuesTable);

        const pendingState = this.cloneState();
        transaction.updateUserStore(this, pendingState, () => this.setCurrentPrimaryColor(app.activePasswordValuesTable))
    }

    private async update()
    {
        const transaction = new StoreUpdateTransaction(app.currentVault.userVaultID);
        transaction.updateUserVaultStore(this, this.state);

        await transaction.commit('');
    }

    public async addPinnedFilter(id: string)
    {
        this.state.pinnedDataTypes[app.currentVault.userVaultID].pinnedFilters[id] = {};
        await this.update();
    }

    public async removePinnedFilters(id: string)
    {
        delete this.state.pinnedDataTypes[app.currentVault.userVaultID].pinnedFilters[id];
        await this.update();
    }

    public async addPinnedGroup(id: string)
    {
        this.state.pinnedDataTypes[app.currentVault.userVaultID].pinnedGroups[id] = {};
        await this.update();
    }

    public async removePinnedGroups(id: string)
    {
        delete this.state.pinnedDataTypes[app.currentVault.userVaultID].pinnedGroups[id];
        await this.update();
    }

    public async addPinnedPassword(id: string)
    {
        this.state.pinnedDataTypes[app.currentVault.userVaultID].pinnedPasswords[id] = {};
        await this.update();
    }

    public async removePinnedPasswords(id: string)
    {
        delete this.state.pinnedDataTypes[app.currentVault.userVaultID].pinnedPasswords[id];
        await this.update();
    }

    public async addPinnedValue(id: string)
    {
        this.state.pinnedDataTypes[app.currentVault.userVaultID].pinnedValues[id] = {};
        await this.update();
    }

    public async removePinnedValues(id: string)
    {
        delete this.state.pinnedDataTypes[app.currentVault.userVaultID].pinnedValues[id];
        await this.update();
    }
}