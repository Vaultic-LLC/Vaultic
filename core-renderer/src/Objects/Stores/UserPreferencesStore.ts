import { ColorPalette, defaultColorPalettes, emptyColorPalette } from "../../Types/Colors";
import { Store } from "./Base";
import { Ref, ref, watch } from "vue";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { api } from "../../API";
import app, { AppStore } from "./AppStore";
import { validateObject } from "../../Helpers/TypeScriptHelper";
import { isHexString } from "../../Helpers/ColorHelper";
import { DataType } from "../../Types/DataTypes";
import { nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { DictionaryAsList, StoreState } from "@vaultic/shared/Types/Stores";

export interface PinnedDataTypes
{
    /** Pinned Filters */
    f: DictionaryAsList;
    /** Pinned Groups */
    g: DictionaryAsList;
    /** Pinned Passwords */
    p: DictionaryAsList;
    /** Pinned Values */
    v: DictionaryAsList;
}

// just used for validation
const emptyDataTypes: PinnedDataTypes =
{
    f: {},
    g: {},
    p: {},
    v: {},
};

interface IUserPreferencesStoreState extends StoreState
{
    /** Current Color Palette */
    c: ColorPalette;
    /** Pinned Data Typtes Keyed by UserVaultID */
    t: { [key: string]: PinnedDataTypes };
    /** Pinned Organizations */
    o: DictionaryAsList;
}

export type UserPreferencesStoreState = IUserPreferencesStoreState;

export class UserPreferencesStore extends Store<UserPreferencesStoreState>
{
    private internalCurrentPrimaryColor: Ref<string>;
    private initalized: Ref<boolean>;

    get currentColorPalette() { return this.state.c; }
    set currentColorPalette(value: ColorPalette) { this.state.c = value; }
    get currentPrimaryColor() { return this.internalCurrentPrimaryColor }

    get pinnedFilters() { return this.getPinnedDataTypes(DataType.Filters) ?? new Map(); }
    get pinnedGroups() { return this.getPinnedDataTypes(DataType.Groups) ?? new Map(); }
    get pinnedPasswords() { return this.getPinnedDataTypes(DataType.Passwords) ?? new Map(); }
    get pinnedValues() { return this.getPinnedDataTypes(DataType.NameValuePairs) ?? new Map(); }
    get pinnedOrganizations() { return this.state.o; }

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
        if (!stateToUse.c || !stateToUse.t)
        {
            stateToUse = this.defaultState();
        }
        else 
        {
            if (!validateObject(stateToUse.c, emptyColorPalette, testProperty) ||
                !validateObject(stateToUse.t, new Map(), undefined, mapTest))
            {
                stateToUse = this.defaultState();
            }

            for (const [key, value] of stateToUse.t)
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
            else if (propName == 'active' || propName == 'i' || propName == 'e')
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
            if (objName == nameof<PinnedDataTypes>("f") ||
                objName == nameof<PinnedDataTypes>("g") ||
                objName == nameof<PinnedDataTypes>("p") ||
                objName == nameof<PinnedDataTypes>("v"))
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
        watch(() => this.state.c, () =>
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

            if (!this.state.t.get(newValue))
            {
                this.setDefaultPinnedDataTypes(newValue, this.state.t);
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
            c: defaultColorPalettes.entries().next().value![1],
            t: defaultPinnedDataTypes,
            o: new Map()
        };
    }

    protected setDefaultPinnedDataTypes(userVaultID: number, pinnedDataTypes: Map<number, PinnedDataTypes>)
    {
        pinnedDataTypes.set(userVaultID, {
            f: new Map(),
            g: new Map(),
            p: new Map(),
            v: new Map(),
        });
    }

    protected getPinnedDataTypes(dataType: DataType)
    {
        if (!app.currentVault.userVaultID)
        {
            return undefined;
        }

        if (!this.state.t.get(app.currentVault.userVaultID))
        {
            this.setDefaultPinnedDataTypes(app.currentVault.userVaultID, this.state.t);
        }

        switch (dataType)
        {
            case DataType.Filters:
                return this.state.t.get(app.currentVault.userVaultID)!.f;
            case DataType.Groups:
                return this.state.t.get(app.currentVault.userVaultID)!.g;
            case DataType.Passwords:
                return this.state.t.get(app.currentVault.userVaultID)!.p;
            case DataType.NameValuePairs:
                return this.state.t.get(app.currentVault.userVaultID)!.v;
        }
    }

    public async loadLastUsersPreferences()
    {
        const state = await api.repositories.users.getLastUsedUserPreferences();
        if (state)
        {
            const parsedState: UserPreferencesStoreState = JSON.vaulticParse(state);
            if (parsedState.c)
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
                this.currentPrimaryColor.value = this.state.c.v.p;
                break;
            case DataType.Passwords:
            case DataType.Devices:
            default:
                this.currentPrimaryColor.value = this.state.c.p.p;
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
        this.state.c = colorPalette;
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

    public async addPinnedOrganization(id: number)
    {
        if (!this.state.o.has(id))
        {
            this.state.o.set(id, id);
            await this.update();
        }
    }

    public async removePinnedOrganization(id: number)
    {
        if (this.state.o.has(id))
        {
            this.state.o.delete(id);
            await this.update();
        }
    }
}