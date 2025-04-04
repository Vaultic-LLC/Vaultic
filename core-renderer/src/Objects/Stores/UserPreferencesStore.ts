import { emptyColorPalette } from "../../Types/Colors";
import { Store } from "./Base";
import { Ref, ref, watch } from "vue";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { api } from "../../API";
import app, { AppStore } from "./AppStore";
import { validateObject } from "../../Helpers/TypeScriptHelper";
import { isHexString } from "../../Helpers/ColorHelper";
import { DataType } from "../../Types/DataTypes";
import { nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { defaultUserPreferencesStoreState, DictionaryAsList, StateKeys, StorePathRetriever, StoreState, StoreType } from "@vaultic/shared/Types/Stores";
import { ColorPalette } from "@vaultic/shared/Types/Color";
import { OH } from "@vaultic/shared/Utilities/PropertyManagers";

type PinnedDataTypeProperty = keyof PinnedDataTypes;

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
    c: { p: ColorPalette };
    /** Pinned Data Typtes Keyed by UserVaultID */
    t: { [key: string]: PinnedDataTypes };
    /** Pinned Organizations */
    o: DictionaryAsList;
}

interface UserPreferencesStateKeys extends StateKeys
{
    'currentColorPalette': '';
    'pinnedDataTypes': '';
    'pinnedDataTypes.filters': '';
    'pinnedDataTypes.groups': '';
    'pinnedDataTypes.passwords': '';
    'pinnedDataTypes.values': '';
    'pinnedOrganizations': '';
}

const UserPreferencesPathRetriever: StorePathRetriever<UserPreferencesStateKeys> =
{
    'currentColorPalette': (...ids: string[]) => `c`,
    'pinnedDataTypes': (...ids: string[]) => 't',
    'pinnedDataTypes.filters': (...ids: string[]) => `t.${ids[0]}.f`,
    'pinnedDataTypes.groups': (...ids: string[]) => `t.${ids[0]}.g`,
    'pinnedDataTypes.passwords': (...ids: string[]) => `t.${ids[0]}.p`,
    'pinnedDataTypes.values': (...ids: string[]) => `t.${ids[0]}.v`,
    'pinnedOrganizations': (...ids: string[]) => 'o'
};

export type UserPreferencesStoreState = IUserPreferencesStoreState;

export class UserPreferencesStore extends Store<UserPreferencesStoreState, UserPreferencesStateKeys>
{
    private internalCurrentPrimaryColor: Ref<string>;
    private initalized: Ref<boolean>;

    get currentColorPalette() { return this.state.c.p; }
    set currentColorPalette(value: ColorPalette) { this.state.c.p = value; }
    get currentPrimaryColor() { return this.internalCurrentPrimaryColor }

    get pinnedFilters() { return this.getPinnedDataTypes(DataType.Filters) ?? {}; }
    get pinnedGroups() { return this.getPinnedDataTypes(DataType.Groups) ?? {}; }
    get pinnedPasswords() { return this.getPinnedDataTypes(DataType.Passwords) ?? {}; }
    get pinnedValues() { return this.getPinnedDataTypes(DataType.NameValuePairs) ?? {}; }
    get pinnedOrganizations() { return this.state.o; }

    constructor()
    {
        super(StoreType.UserPreferences, UserPreferencesPathRetriever);

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
            if (!validateObject(stateToUse.c, { p: emptyColorPalette }, testProperty) ||
                !validateObject(stateToUse.t, new Map(), undefined, mapTest))
            {
                stateToUse = this.defaultState();
            }

            for (const [key, value] of Object.entries(stateToUse.t))
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
        watch(() => this.state.c.p, () =>
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
        return defaultUserPreferencesStoreState;
    }

    protected getPinnedDataTypes(dataType: DataType)
    {
        if (!app.currentVault.userVaultID)
        {
            return undefined;
        }

        if (!OH.has(this.state.t, app.currentVault.userVaultID.toString()))
        {
            return {};
        }

        switch (dataType)
        {
            case DataType.Filters:
                return this.state.t[app.currentVault.userVaultID]!.f;
            case DataType.Groups:
                return this.state.t[app.currentVault.userVaultID]!.g;
            case DataType.Passwords:
                return this.state.t[app.currentVault.userVaultID]!.p;
            case DataType.NameValuePairs:
                return this.state.t[app.currentVault.userVaultID]!.v;
        }
    }

    public async loadLastUsersPreferences()
    {
        const state = await api.repositories.users.getLastUsedUserPreferences();
        if (state)
        {
            const parsedState: UserPreferencesStoreState = JSON.parse(state);
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
                this.currentPrimaryColor.value = this.state.c.p.v.p;
                break;
            case DataType.Passwords:
            case DataType.Devices:
            default:
                this.currentPrimaryColor.value = this.state.c.p.p.p;
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
        this.state.c.p = colorPalette;
        this.setCurrentPrimaryColor(app.activeDataType);

        const pendingState = this.getPendingState()!;
        pendingState.updateValue('currentColorPalette', 'p', colorPalette);

        transaction.updateUserStore(this, pendingState, () => this.setCurrentPrimaryColor(app.activeDataType))
    }

    private async addPinnedDataType(
        id: string,
        path: keyof UserPreferencesStateKeys,
        pinnedDataTypeProperty?: PinnedDataTypeProperty)
    {
        const pendingUserPreferencesState = this.getPendingState()!;

        const idString = app.currentVault.userVaultID.toString();
        if (pinnedDataTypeProperty && !OH.has(pendingUserPreferencesState.state.t, idString))
        {
            const dataTypes: PinnedDataTypes = {
                f: {},
                g: {},
                p: {},
                v: {}
            };

            dataTypes[pinnedDataTypeProperty][id] = true;
            pendingUserPreferencesState.addValue('pinnedDataTypes', idString, dataTypes);
        }
        else
        {
            pendingUserPreferencesState.addValue(path, id, true);
        }

        const transaction = new StoreUpdateTransaction(app.currentVault.userVaultID);
        transaction.updateUserStore(this, pendingUserPreferencesState);

        await transaction.commit('');
    }

    private async removePinnedDataType(path: keyof UserPreferencesStateKeys, id: string)
    {
        if (!OH.has(this.state.t, app.currentVault.userVaultID.toString()))
        {
            return;
        }

        const state = this.getPendingState()!;
        state.deleteValue(path, id);

        const transaction = new StoreUpdateTransaction(app.currentVault.userVaultID);
        transaction.updateUserStore(this, state);

        await transaction.commit('');
    }

    public async addPinnedFilter(id: string)
    {
        await this.addPinnedDataType(id, 'pinnedDataTypes.filters', 'f');
    }

    public async removePinnedFilters(id: string)
    {
        await this.removePinnedDataType('pinnedDataTypes.filters', id);
    }

    public async addPinnedGroup(id: string)
    {
        await this.addPinnedDataType(id, 'pinnedDataTypes.groups', 'g');
    }

    public async removePinnedGroups(id: string)
    {
        await this.removePinnedDataType('pinnedDataTypes.groups', id);
    }

    public async addPinnedPassword(id: string)
    {
        await this.addPinnedDataType(id, 'pinnedDataTypes.passwords', 'p');
    }

    public async removePinnedPasswords(id: string)
    {
        await this.removePinnedDataType('pinnedDataTypes.passwords', id);
    }

    public async addPinnedValue(id: string)
    {
        await this.addPinnedDataType(id, 'pinnedDataTypes.values', 'v');
    }

    public async removePinnedValues(id: string)
    {
        await this.removePinnedDataType('pinnedDataTypes.values', id);
    }

    public async addPinnedOrganization(id: number)
    {
        const stringID = id.toString();
        if (!OH.has(this.state.o, stringID))
        {
            await this.addPinnedDataType(stringID, 'pinnedOrganizations');
        }
    }

    public async removePinnedOrganization(id: number)
    {
        const stringID = id.toString();
        if (OH.has(this.state.o, stringID))
        {
            await this.removePinnedDataType('pinnedOrganizations', stringID);
        }
    }
}