import { ColorPalette, defaultColorPalettes, emptyColorPalette } from "../../Types/Colors";
import { Store, StoreState } from "./Base";
import { Ref, ref, watch } from "vue";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { api } from "../../API";
import app, { AppStore } from "./AppStore";
import { validateObject } from "../../Helpers/TypeScriptHelper";
import { isHexString } from "../../Helpers/ColorHelper";
import { DataType } from "../../Types/DataTypes";
import { nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { FieldTreeUtility } from "../../Types/Tree";

export interface PinnedDataTypes
{
    pinnedFilters: Map<string, string>;
    pinnedGroups: Map<string, string>;
    pinnedPasswords: Map<string, string>;
    pinnedValues: Map<string, string>;
}

// just used for validation
const emptyDataTypes: PinnedDataTypes =
{
    pinnedFilters: new Map<string, string>(),
    pinnedGroups: new Map<string, string>(),
    pinnedPasswords: new Map<string, string>(),
    pinnedValues: new Map<string, string>(),
};

interface IUserPreferencesStoreState extends StoreState
{
    currentColorPalette: ColorPalette;
    pinnedDataTypes: Map<number, PinnedDataTypes>; // keyed by userVaultID
    pinnedDesktopDevices: Map<number, number>;
    pinnedMobileDevices: Map<number, number>;
    pinnedOrganizations: Map<number, number>;
}

export type UserPreferencesStoreState = IUserPreferencesStoreState;

export class UserPreferencesStore extends Store<UserPreferencesStoreState>
{
    private internalCurrentPrimaryColor: Ref<string>;
    private initalized: Ref<boolean>;

    get currentColorPalette() { return this.state.currentColorPalette; }
    set currentColorPalette(value: ColorPalette) { this.state.currentColorPalette = value; }
    get currentPrimaryColor() { return this.internalCurrentPrimaryColor }

    get pinnedFilters() { return this.getPinnedDataTypes(DataType.Filters) ?? new Map(); }
    get pinnedGroups() { return this.getPinnedDataTypes(DataType.Groups) ?? new Map(); }
    get pinnedPasswords() { return this.getPinnedDataTypes(DataType.Passwords) ?? new Map(); }
    get pinnedValues() { return this.getPinnedDataTypes(DataType.NameValuePairs) ?? new Map(); }
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
            if (!validateObject(stateToUse.currentColorPalette, emptyColorPalette, testProperty) ||
                !validateObject(stateToUse.pinnedDataTypes, new Map(), undefined, mapTest))
            {
                stateToUse = this.defaultState();
            }

            for (const [key, value] of stateToUse.pinnedDataTypes)
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

            if (!this.state.pinnedDataTypes.get(newValue))
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
        const defaultPinnedDataTypes = new Map<number, PinnedDataTypes>();
        if (this.initalized?.value && app.currentVault.userVaultID)
        {
            this.setDefaultPinnedDataTypes(app.currentVault.userVaultID, defaultPinnedDataTypes);
        }

        return {
            version: 0,
            currentColorPalette: defaultColorPalettes.entries().next().value![1],
            pinnedDataTypes: defaultPinnedDataTypes,
            pinnedDesktopDevices: new Map(),
            pinnedMobileDevices: new Map(),
            pinnedOrganizations: new Map()
        };
    }

    protected setDefaultPinnedDataTypes(userVaultID: number, pinnedDataTypes: Map<number, PinnedDataTypes>)
    {
        pinnedDataTypes.set(userVaultID, {
            pinnedFilters: new Map(),
            pinnedGroups: new Map(),
            pinnedPasswords: new Map(),
            pinnedValues: new Map(),
        });
    }

    protected getPinnedDataTypes(dataType: DataType)
    {
        if (!app.currentVault.userVaultID)
        {
            return undefined;
        }

        if (!this.state.pinnedDataTypes.get(app.currentVault.userVaultID))
        {
            this.setDefaultPinnedDataTypes(app.currentVault.userVaultID, this.state.pinnedDataTypes);
        }

        switch (dataType)
        {
            case DataType.Filters:
                return this.state.pinnedDataTypes.get(app.currentVault.userVaultID)!.pinnedFilters;
            case DataType.Groups:
                return this.state.pinnedDataTypes.get(app.currentVault.userVaultID)!.pinnedGroups;
            case DataType.Passwords:
                return this.state.pinnedDataTypes.get(app.currentVault.userVaultID)!.pinnedPasswords;
            case DataType.NameValuePairs:
                return this.state.pinnedDataTypes.get(app.currentVault.userVaultID)!.pinnedValues;
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
                this.currentPrimaryColor.value = this.state.currentColorPalette.valuesColor.primaryColor;
                break;
            case DataType.Passwords:
            case DataType.Devices:
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
        this.getPinnedDataTypes(DataType.Filters)?.set(id, id);
        await this.update();
    }

    public async removePinnedFilters(id: string)
    {
        this.getPinnedDataTypes(DataType.Filters)?.delete(id);
        await this.update();
    }

    public async addPinnedGroup(id: string)
    {
        this.getPinnedDataTypes(DataType.Groups)?.set(id, id);
        await this.update();
    }

    public async removePinnedGroups(id: string)
    {
        this.getPinnedDataTypes(DataType.Groups)?.delete(id);
        await this.update();
    }

    public async addPinnedPassword(id: string)
    {
        this.getPinnedDataTypes(DataType.Passwords)?.set(id, id);
        await this.update();
    }

    public async removePinnedPasswords(id: string)
    {
        this.getPinnedDataTypes(DataType.Passwords)?.delete(id);
        await this.update();
    }

    public async addPinnedValue(id: string)
    {
        this.getPinnedDataTypes(DataType.NameValuePairs)?.set(id, id);
        await this.update();
    }

    public async removePinnedValues(id: string)
    {
        this.getPinnedDataTypes(DataType.NameValuePairs)?.delete(id);
        await this.update();
    }

    public async addPinnedDevice(id: number, desktop: boolean)
    {
        if (desktop)
        {
            this.state.pinnedDesktopDevices.set(id, id);
        }
        else 
        {
            this.state.pinnedMobileDevices.set(id, id);
        }

        await this.update();
    }

    public async removePinnedDevice(id: number, desktop: boolean)
    {
        if (desktop)
        {
            this.state.pinnedDesktopDevices.delete(id);
        }
        else 
        {
            this.state.pinnedMobileDevices.delete(id);
        }

        await this.update();
    }

    public async addPinnedOrganization(id: number)
    {
        if (!this.state.pinnedOrganizations.has(id))
        {
            this.state.pinnedOrganizations.set(id, id);
            await this.update();
        }
    }

    public async removePinnedOrganization(id: number)
    {
        if (this.state.pinnedOrganizations.has(id))
        {
            this.state.pinnedOrganizations.delete(id);
            await this.update();
        }
    }
}