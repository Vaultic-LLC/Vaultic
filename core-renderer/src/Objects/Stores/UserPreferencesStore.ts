import { ColorPalette, defaultColorPalettes, emptyColorPalette } from "../../Types/Colors";
import { Store, StoreState } from "./Base";
import { computed, ComputedRef, Ref, ref, watch } from "vue";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { api } from "../../API";
import app, { AppStore } from "./AppStore";
import { validateObject } from "../../Helpers/TypeScriptHelper";
import { isHexString } from "../../Helpers/ColorHelper";
import { DataType } from "../../Types/DataTypes";
import { nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { Field, IFieldedObject, KnownMappedFields } from "@vaultic/shared/Types/Fields";
import { FieldTreeUtility } from "../../Types/Tree";
import { WebFieldConstructor } from "../../Types/Fields";

export interface PinnedDataTypes extends IFieldedObject
{
    pinnedFilters: Field<Map<string, Field<string>>>;
    pinnedGroups: Field<Map<string, Field<string>>>;
    pinnedPasswords: Field<Map<string, Field<string>>>;
    pinnedValues: Field<Map<string, Field<string>>>;
}

// just used for validation
const emptyDataTypes: Field<PinnedDataTypes> = WebFieldConstructor.create(
    {
        id: WebFieldConstructor.create(""),
        pinnedFilters: WebFieldConstructor.create(new Map<string, Field<string>>()),
        pinnedGroups: WebFieldConstructor.create(new Map<string, Field<string>>()),
        pinnedPasswords: WebFieldConstructor.create(new Map<string, Field<string>>()),
        pinnedValues: WebFieldConstructor.create(new Map<string, Field<string>>()),
    });

interface IUserPreferencesStoreState extends StoreState
{
    currentColorPalette: Field<ColorPalette>;
    pinnedDataTypes: Field<Map<number, Field<KnownMappedFields<PinnedDataTypes>>>>; // keyed by userVaultID
    pinnedDesktopDevices: Field<Map<number, Field<number>>>;
    pinnedMobileDevices: Field<Map<number, Field<number>>>;
    pinnedOrganizations: Field<Map<number, Field<number>>>;
}

export type UserPreferencesStoreState = KnownMappedFields<IUserPreferencesStoreState>;

export class UserPreferencesStore extends Store<UserPreferencesStoreState>
{
    private internalCurrentPrimaryColor: Ref<string>;
    private initalized: Ref<boolean>;

    get currentColorPalette() { return this.state.currentColorPalette.value; }
    set currentColorPalette(value: ColorPalette) { this.state.currentColorPalette.value = value; }
    get currentPrimaryColor() { return this.internalCurrentPrimaryColor }

    get pinnedFilters() { return this.getPinnedDataTypes(DataType.Filters) ?? WebFieldConstructor.create(new Map()); }
    get pinnedGroups() { return this.getPinnedDataTypes(DataType.Groups) ?? WebFieldConstructor.create(new Map()); }
    get pinnedPasswords() { return this.getPinnedDataTypes(DataType.Passwords) ?? WebFieldConstructor.create(new Map()); }
    get pinnedValues() { return this.getPinnedDataTypes(DataType.NameValuePairs) ?? WebFieldConstructor.create(new Map()); }
    get pinnedDesktopDevices() { return this.state.pinnedDesktopDevices; }
    get pinnedMobileDevices() { return this.state.pinnedMobileDevices; }
    get pinnedOrganizations() { return this.state.pinnedOrganizations; }

    constructor()
    {
        super("userPreferencesStoreState");

        this.internalCurrentPrimaryColor = ref('');
        this.initalized = ref(false)
        this.setCurrentPrimaryColor(DataType.Passwords);
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
            if (!validateObject(stateToUse.currentColorPalette, WebFieldConstructor.create(emptyColorPalette), testProperty) ||
                !validateObject(stateToUse.pinnedDataTypes, WebFieldConstructor.create(new Map()), undefined, mapTest))
            {
                stateToUse = this.defaultState();
            }

            for (const [key, value] of stateToUse.pinnedDataTypes.value)
            {
                if (!validateObject(value, emptyDataTypes, undefined, mapTest))
                {
                    stateToUse = this.defaultState();
                    break;
                }
            }
        }

        super.updateState(stateToUse);

        function testProperty(propName: string, propValue: any): boolean
        {
            if (propName == 'id')
            {
                return isGuid(propValue)
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

        function mapTest(objName: string, propName: any, _: any)
        {
            if (objName == nameof<PinnedDataTypes>("pinnedFilters") ||
                objName == nameof<PinnedDataTypes>("pinnedGroups") ||
                objName == nameof<PinnedDataTypes>("pinnedPasswords") ||
                objName == nameof<PinnedDataTypes>("pinnedValues"))
            {
                return isGuid(propName);
            }

            return typeof propName == "number";
        }

        function isGuid(val: string)
        {
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
        }
    }

    public init(appStore: AppStore)
    {
        watch(() => this.state.currentColorPalette, () =>
        {
            this.setCurrentPrimaryColor(appStore.activeDataType);
        });

        watch(() => appStore.activePasswordValuesTable, (newValue) =>
        {
            this.setCurrentPrimaryColor(newValue);
        });

        watch(() => appStore.activeDeviceOrganizationsTable, (newValue) =>
        {
            this.setCurrentPrimaryColor(newValue);
        });

        watch(() => appStore.currentVault.reactiveUserVaultID, (newValue) => 
        {
            if (!newValue)
            {
                return;
            }

            if (!this.state.pinnedDataTypes.value.get(newValue))
            {
                this.setDefaultPinnedDataTypes(newValue, this.state.pinnedDataTypes);
            }
        });

        watch(() => appStore.isVaultView, (newValue, _) =>
        {
            if (newValue)
            {
                this.setCurrentPrimaryColor(appStore.activePasswordValuesTable);
            }
            else
            {
                this.setCurrentPrimaryColor(appStore.activeDeviceOrganizationsTable);
            }
        });

        this.setCurrentPrimaryColor(appStore.activePasswordValuesTable);
        this.initalized.value = true;
    }

    protected defaultState(): UserPreferencesStoreState
    {
        const defaultPinnedDataTypes = WebFieldConstructor.create(new Map<number, Field<PinnedDataTypes>>());
        if (this.initalized?.value && app.currentVault.userVaultID)
        {
            this.setDefaultPinnedDataTypes(app.currentVault.userVaultID, defaultPinnedDataTypes);
        }

        return FieldTreeUtility.setupIDs<IUserPreferencesStoreState>({
            version: WebFieldConstructor.create(0),
            currentColorPalette: defaultColorPalettes.entries().next().value![1],
            pinnedDataTypes: defaultPinnedDataTypes,
            pinnedDesktopDevices: WebFieldConstructor.create(new Map()),
            pinnedMobileDevices: WebFieldConstructor.create(new Map()),
            pinnedOrganizations: WebFieldConstructor.create(new Map())
        });
    }

    protected setDefaultPinnedDataTypes(userVaultID: number, pinnedDataTypes: Field<Map<number, Field<PinnedDataTypes>>>)
    {
        pinnedDataTypes.value.set(userVaultID, WebFieldConstructor.create({
            id: WebFieldConstructor.create(""),
            pinnedFilters: WebFieldConstructor.create(new Map()),
            pinnedGroups: WebFieldConstructor.create(new Map()),
            pinnedPasswords: WebFieldConstructor.create(new Map()),
            pinnedValues: WebFieldConstructor.create(new Map()),
        }));
    }

    protected getPinnedDataTypes(dataType: DataType)
    {
        if (!app.currentVault.userVaultID)
        {
            return undefined;
        }

        if (!this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID))
        {
            this.setDefaultPinnedDataTypes(app.currentVault.userVaultID, this.state.pinnedDataTypes);
        }

        switch (dataType)
        {
            case DataType.Filters:
                return this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)!.value.pinnedFilters;
            case DataType.Groups:
                return this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)!.value.pinnedGroups;
            case DataType.Passwords:
                return this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)!.value.pinnedPasswords;
            case DataType.NameValuePairs:
                return this.state.pinnedDataTypes.value.get(app.currentVault.userVaultID)!.value.pinnedValues;
        }
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
            case DataType.Organizations:
                this.currentPrimaryColor.value = this.state.currentColorPalette.value.valuesColor.value.primaryColor.value;
                break;
            case DataType.Passwords:
            case DataType.Devices:
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
        this.setCurrentPrimaryColor(app.activeDataType);

        const pendingState = this.cloneState();
        transaction.updateUserStore(this, pendingState, () => this.setCurrentPrimaryColor(app.activeDataType))
    }

    private async update()
    {
        const transaction = new StoreUpdateTransaction(app.currentVault.userVaultID);
        transaction.updateUserStore(this, this.state);

        await transaction.commit('');
    }

    public async addPinnedFilter(id: string)
    {
        this.getPinnedDataTypes(DataType.Filters)?.value.set(id, WebFieldConstructor.create(id));
        await this.update();
    }

    public async removePinnedFilters(id: string)
    {
        this.getPinnedDataTypes(DataType.Filters)?.value.delete(id);
        await this.update();
    }

    public async addPinnedGroup(id: string)
    {
        this.getPinnedDataTypes(DataType.Groups)?.value.set(id, WebFieldConstructor.create(id));
        await this.update();
    }

    public async removePinnedGroups(id: string)
    {
        this.getPinnedDataTypes(DataType.Groups)?.value.delete(id);
        await this.update();
    }

    public async addPinnedPassword(id: string)
    {
        this.getPinnedDataTypes(DataType.Passwords)?.value.set(id, WebFieldConstructor.create(id));
        await this.update();
    }

    public async removePinnedPasswords(id: string)
    {
        this.getPinnedDataTypes(DataType.Passwords)?.value.delete(id);
        await this.update();
    }

    public async addPinnedValue(id: string)
    {
        this.getPinnedDataTypes(DataType.NameValuePairs)?.value.set(id, WebFieldConstructor.create(id));
        await this.update();
    }

    public async removePinnedValues(id: string)
    {
        this.getPinnedDataTypes(DataType.NameValuePairs)?.value.delete(id);
        await this.update();
    }

    public async addPinnedDevice(id: number, desktop: boolean)
    {
        if (desktop)
        {
            this.state.pinnedDesktopDevices.value.set(id, WebFieldConstructor.create(id));
        }
        else 
        {
            this.state.pinnedMobileDevices.value.set(id, WebFieldConstructor.create(id));
        }

        await this.update();
    }

    public async removePinnedDevice(id: number, desktop: boolean)
    {
        if (desktop)
        {
            this.state.pinnedDesktopDevices.value.delete(id);
        }
        else 
        {
            this.state.pinnedMobileDevices.value.delete(id);
        }

        await this.update();
    }

    public async addPinnedOrganization(id: number)
    {
        if (!this.state.pinnedOrganizations.value.has(id))
        {
            this.state.pinnedOrganizations.value.set(id, WebFieldConstructor.create(id));
            await this.update();
        }
    }

    public async removePinnedOrganization(id: number)
    {
        if (this.state.pinnedOrganizations.value.has(id))
        {
            this.state.pinnedOrganizations.value.delete(id);
            await this.update();
        }
    }
}