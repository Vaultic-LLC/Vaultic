import { ColorPalette, colorPalettes, emptyColorPalette } from "../../Types/Colors";
import { Store, StoreState } from "./Base";
import { Ref, ref, watch } from "vue";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { api } from "../../API";
import app, { AppStore } from "./AppStore";
import { validateObject } from "../../Helpers/TypeScriptHelper";
import { isHexString } from "../../Helpers/ColorHelper";
import { DataType } from "../../Types/DataTypes";
import { nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { Field, FieldedObject, KnownMappedFields } from "@vaultic/shared/Types/Fields";

export interface PinnedDataTypes extends FieldedObject
{
    pinnedFilters: Field<Map<string, Field<string>>>;
    pinnedGroups: Field<Map<string, Field<string>>>;
    pinnedPasswords: Field<Map<string, Field<string>>>;
    pinnedValues: Field<Map<string, Field<string>>>;
}

// just used for validation
const emptyDataTypes: PinnedDataTypes =
{
    id: new Field(""),
    pinnedFilters: new Field(new Map<string, Field<string>>()),
    pinnedGroups: new Field(new Map<string, Field<string>>()),
    pinnedPasswords: new Field(new Map<string, Field<string>>()),
    pinnedValues: new Field(new Map<string, Field<string>>())
};

interface IUserPreferencesStoreState extends StoreState
{
    currentColorPalette: Field<ColorPalette>;
    // keyed by userVaultID
    pinnedDataTypes: Field<Map<number, Field<KnownMappedFields<PinnedDataTypes>>>>;
}

export type UserPreferencesStoreState = KnownMappedFields<IUserPreferencesStoreState>;

export class UserPreferencesStore extends Store<UserPreferencesStoreState>
{
    private internalCurrentPrimaryColor: Ref<string>;

    get currentColorPalette() { return this.state.currentColorPalette.value; }
    set currentColorPalette(value: ColorPalette) { this.state.currentColorPalette.value = value; }
    get currentPrimaryColor() { return this.internalCurrentPrimaryColor }

    get pinnedFilters() { return this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)?.value.pinnedFilters ?? new Field(new Map()); }
    get pinnedGroups() { return this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)?.value.pinnedGroups ?? new Field(new Map()); }
    get pinnedPasswords() { return this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)?.value.pinnedPasswords ?? new Field(new Map()); }
    get pinnedValues() { return this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)?.value.pinnedValues ?? new Field(new Map()); }

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
            // TODO: does this still work with fields?
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
            if (!this.state.pinnedDataTypes.value.get(newValue))
            {
                this.state.pinnedDataTypes.value.set(newValue, new Field({
                    id: new Field(""),
                    pinnedFilters: new Field(new Map()),
                    pinnedGroups: new Field(new Map()),
                    pinnedPasswords: new Field(new Map()),
                    pinnedValues: new Field(new Map())
                }));
            }
        });

        this.setCurrentPrimaryColor(appStore.activePasswordValuesTable);
    }

    protected defaultState(): UserPreferencesStoreState
    {
        return {
            currentColorPalette: colorPalettes.entries().next().value![1],
            pinnedDataTypes: new Field(new Map<number, Field<PinnedDataTypes>>())
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
                this.currentPrimaryColor.value = this.state.currentColorPalette.value.valuesColor.value.primaryColor.value;
                break;
            case DataType.Passwords:
            default:
                this.currentPrimaryColor.value = this.state.currentColorPalette.value.passwordsColor.value.primaryColor.value;
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
        this.state.currentColorPalette.value = colorPalette;
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
        this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)?.value.pinnedFilters.value.set(id, new Field(id));
        await this.update();
    }

    public async removePinnedFilters(id: string)
    {
        this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)?.value.pinnedFilters.value.delete(id);
        await this.update();
    }

    public async addPinnedGroup(id: string)
    {
        this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)?.value.pinnedGroups.value.set(id, new Field(id));
        await this.update();
    }

    public async removePinnedGroups(id: string)
    {
        this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)?.value.pinnedGroups.value.delete(id);
        await this.update();
    }

    public async addPinnedPassword(id: string)
    {
        this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)?.value.pinnedPasswords.value.set(id, new Field(id));
        await this.update();
    }

    public async removePinnedPasswords(id: string)
    {
        this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)?.value.pinnedPasswords.value.delete(id);
        await this.update();
    }

    public async addPinnedValue(id: string)
    {
        this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)?.value.pinnedValues.value.set(id, new Field(id));
        await this.update();
    }

    public async removePinnedValues(id: string)
    {
        this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)?.value.pinnedValues.value.delete(id);
        await this.update();
    }
}