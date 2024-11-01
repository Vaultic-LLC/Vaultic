import { Ref, ref, ComputedRef, computed, watch } from "vue";
import { hideAll } from 'tippy.js';
import { Store, StoreEvents, StoreState } from "./Base";
import { AccountSetupView } from "../../Types/Models";
import { api } from "../../API"
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { ColorPalette, colorPalettes } from "../../Types/Colors";
import { AutoLockTime } from "../../Types/Settings";
import { BasicVaultStore, ReactiveVaultStore } from "./VaultStore";
import { UserPreferencesStore } from "./UserPreferencesStore";
import { UserDataBreachStore } from "./UserDataBreachStore";
import { createPopupStore, PopupStore } from "./PopupStore";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";
import { DisplayVault, UserData, CondensedVaultData } from "@vaultic/shared/Types/Entities";
import { FilterStatus, DataType } from "../../Types/DataTypes";
import { UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";
import { Field, IFieldedObject, KnownMappedFields } from "@vaultic/shared/Types/Fields";

export interface AppSettings extends IFieldedObject
{
    colorPalettes: Field<Map<string, Field<ColorPalette>>>;
    autoLockTime: Field<AutoLockTime>;
    randomValueLength: Field<number>;
    randomPhraseLength: Field<number>;
    multipleFilterBehavior: Field<FilterStatus>;
    oldPasswordDays: Field<number>;
    percentMetricForPulse: Field<number>;
    defaultMarkdownInEditScreens: Field<boolean>;
}

export interface IAppStoreState extends StoreState
{
    settings: Field<AppSettings>;
}

export type AppStoreState = KnownMappedFields<IAppStoreState>;

export type AppStoreEvents = StoreEvents | "onVaultUpdated" | "onVaultActive";

export class AppStore extends Store<AppStoreState, AppStoreEvents>
{
    private loadedUser: boolean;
    private autoLockTimeoutID: NodeJS.Timeout | undefined;

    private internalActivePasswordValueTable: Ref<DataType> = ref(DataType.Passwords);
    private internalActiveFilterGroupTable: Ref<DataType> = ref(DataType.Filters);

    private internalAutoLockNumberTime: ComputedRef<number>;

    private internalIsOnline: Ref<boolean>;

    private internalColorPalettes: ComputedRef<Field<ColorPalette>[]>;

    private internalUserVaults: Ref<DisplayVault[]>;
    private internalSharedVaults: Ref<BasicVaultStore[]>;
    private internalArchivedVaults: Ref<BasicVaultStore[]>;
    private internalCurrentVault: ReactiveVaultStore;

    private internalUsersPreferencesStore: UserPreferencesStore;
    private internalUserDataBreachStore: UserDataBreachStore;
    private internalPopupStore: PopupStore;

    get settings() { return this.state.settings; }
    get isOnline() { return this.internalIsOnline.value; }
    set isOnline(value: boolean) { this.internalIsOnline.value = value; }
    get activePasswordValuesTable() { return this.internalActivePasswordValueTable.value; }
    set activePasswordValuesTable(value: DataType) { this.internalActivePasswordValueTable.value = value; }
    get activeFilterGroupsTable() { return this.internalActiveFilterGroupTable.value; }
    set activeFilterGroupsTable(value: DataType) { this.internalActiveFilterGroupTable.value = value; }
    get colorPalettes() { return this.internalColorPalettes.value; }
    get userVaults() { return this.internalUserVaults; }
    get archivedVaults() { return this.internalArchivedVaults; }
    get currentVault() { return this.internalCurrentVault; }
    get userPreferences() { return this.internalUsersPreferencesStore; }
    get userDataBreaches() { return this.internalUserDataBreachStore; }
    get popups() { return this.internalPopupStore; }

    constructor()
    {
        super("appStoreState");

        this.loadedUser = false;
        this.internalUserDataBreachStore = new UserDataBreachStore();
        this.internalPopupStore = createPopupStore();

        this.internalColorPalettes = computed(() => this.state.settings.value.colorPalettes.value.valueArray())

        this.internalUserVaults = ref([]);
        this.internalSharedVaults = ref([]);
        this.internalArchivedVaults = ref([]);
        this.internalCurrentVault = new ReactiveVaultStore();
        // done after current vault so we can watch for userVaultID
        this.internalUsersPreferencesStore = new UserPreferencesStore(this);

        this.internalIsOnline = ref(false);
        this.internalActivePasswordValueTable = ref(DataType.Passwords);
        this.internalActiveFilterGroupTable = ref(DataType.Filters);

        this.internalAutoLockNumberTime = computed(() => this.calcAutolockTime(this.state.settings.value.autoLockTime.value));

        watch(() => this.internalAutoLockNumberTime.value, (newValue) => 
        {
            this.resetSessionTime();
        });
    }

    protected defaultState()
    {
        return {
            id: new Field(""),
            settings: new Field({
                id: new Field(""),
                colorPalettes: new Field(colorPalettes),
                autoLockTime: new Field(AutoLockTime.OneMinute),
                randomValueLength: new Field(25),
                randomPhraseLength: new Field(7),
                multipleFilterBehavior: new Field(FilterStatus.Or),
                oldPasswordDays: new Field(365),
                percentMetricForPulse: new Field(1),
                defaultMarkdownInEditScreens: new Field(true)
            })
        };
    }

    private calcAutolockTime(time: AutoLockTime): number
    {
        switch (time)
        {
            case AutoLockTime.FiveMinutes:
                return 1000 * 60 * 5;
            case AutoLockTime.FifteenMinutes:
                return 1000 * 60 * 15;
            case AutoLockTime.ThirtyMinutes:
                return 1000 * 60 * 30;
            case AutoLockTime.OneMinute:
            default:
                return 1000 * 60;
        }
    }

    public resetToDefault()
    {
        super.resetToDefault();
    }

    public async lock(redirect: boolean = true, expireSession: boolean = true)
    {
        hideAll();

        if (redirect)
        {
            this.internalPopupStore.showAccountSetup(AccountSetupView.SignIn);
        }

        if (expireSession && this.isOnline === true)
        {
            api.server.session.expire();
        }

        this.currentVault.passwordStore.resetToDefault();
        this.currentVault.valueStore.resetToDefault();
        this.currentVault.filterStore.resetToDefault();
        this.currentVault.groupStore.resetToDefault();
        this.currentVault.vaultPreferencesStore.resetToDefault();
        this.internalUserDataBreachStore.resetToDefault();

        this.internalUserVaults.value = [];
        this.internalArchivedVaults.value = [];
        this.internalSharedVaults.value = [];
        this.internalCurrentVault.resetToDefault();

        await api.cache.clear();

        this.isOnline = false;
        this.loadedUser = false;
    }

    public resetSessionTime()
    {
        clearTimeout(this.autoLockTimeoutID);
        this.autoLockTimeoutID = setTimeout(() =>
        {
            this.lock();
        }, this.internalAutoLockNumberTime.value);
    }

    public async loadUserData(masterKey: string, payload?: UserDataPayload)
    {
        if (this.loadedUser)
        {
            return false;
        }

        const userData = await api.repositories.users.getCurrentUserData(masterKey);
        if (!userData.success)
        {
            defaultHandleFailedResponse(userData);
            return false;
        }

        const parsedUserData: UserData = JSON.vaulticParse(userData.value!);

        await this.initalizeNewStateFromJSON(parsedUserData.appStoreState);
        await this.internalUsersPreferencesStore.initalizeNewStateFromJSON(parsedUserData.userPreferencesStoreState);

        this.internalUserVaults.value = parsedUserData.displayVaults!;
        this.internalSharedVaults.value = payload?.sharedVaults?.map(v => new BasicVaultStore(v)) ?? [];
        this.internalArchivedVaults.value = payload?.archivedVaults?.map(v => new BasicVaultStore(v)) ?? [];

        await this.internalCurrentVault.setReactiveVaultStoreData(masterKey, parsedUserData.currentVault!);
        this.loadedUser = true;

        return true;
    }

    async createNewVault(masterKey: string, name: string, setAsActive: boolean)
    {
        const result = await api.repositories.vaults.createNewVaultForUser(masterKey, name, setAsActive, this.isOnline);
        if (!result.success)
        {
            defaultHandleFailedResponse(result);
            return false;
        }

        const vaultData = result.value!;
        if (setAsActive)
        {
            await this.internalCurrentVault.setReactiveVaultStoreData(masterKey, vaultData);
        }

        // force trigger reactivity
        const temp = [...this.internalUserVaults.value];
        temp.push({
            userVaultID: vaultData.userVaultID,
            name: vaultData.name,
            lastUsed: setAsActive
        });

        this.internalUserVaults.value = temp;
        return true;
    }

    async updateVault(masterKey: string, displayVault: DisplayVault): Promise<boolean>
    {
        const success = await api.repositories.vaults.saveVault(masterKey, displayVault.userVaultID!, JSON.vaulticStringify(displayVault));
        if (!success)
        {
            return false;
        }

        const index = this.userVaults.value.findIndex(uv => uv.userVaultID == displayVault.userVaultID);
        if (index == -1)
        {
            return false;
        }

        this.userVaults.value[index] = displayVault;
        this.emit("onVaultUpdated", displayVault);

        return true;
    }

    async archiveVault(masterKey: string, userVaultID: number): Promise<boolean>
    {
        const response = await api.repositories.vaults.archiveVault(masterKey, userVaultID, app.isOnline);
        if (!response.success)
        {
            defaultHandleFailedResponse(response);
            return false;
        }

        const index = this.userVaults.value.findIndex(v => v.userVaultID == userVaultID);
        if (index == -1)
        {
            return false;
        }

        const tempUserVaults = [...this.userVaults.value];
        const archivedDisplayVault = tempUserVaults.splice(index, 1)
        const archviedVault = new BasicVaultStore(archivedDisplayVault[0])

        // force reactivity. For some reason it doesn't work otherwise
        this.internalUserVaults.value = tempUserVaults;

        const tempArchivedVaults = [...this.internalArchivedVaults.value];
        tempArchivedVaults.push(archviedVault);
        this.internalArchivedVaults.value = tempArchivedVaults;

        return true;
    }

    async loadArchivedVault(masterKey: string, userVaultID: number): Promise<boolean>
    {
        const archivedVault = this.archivedVaults.value.filter(v => v.userVaultID == userVaultID);
        if (archivedVault.length != 1)
        {
            return false;
        }

        if (!archivedVault[0].isLoaded)
        {
            const vaultData = await api.helpers.vault.loadArchivedVault(masterKey, userVaultID);
            if (!vaultData.success)
            {
                return false;
            }

            await archivedVault[0].setBasicVaultStoreData(vaultData.value as CondensedVaultData);
        }

        await this.internalCurrentVault.setVaultDataFromBasicVault(masterKey, archivedVault[0], false, true);
        return true;
    }

    async unarchiveVault(masterKey: string, userVaultID: number): Promise<boolean>
    {
        const index = this.archivedVaults.value.findIndex(v => v.userVaultID == userVaultID);
        if (index == -1)
        {
            return false;
        }

        const selected = this.currentVault.userVaultID == userVaultID;
        let response = await api.helpers.vault.unarchiveVault(masterKey, userVaultID, selected);

        if (!response.success)
        {
            return false;
        }

        const vaultData = response.value! as CondensedVaultData;

        const tempUserVaults = [...this.internalUserVaults.value];
        const tempArchivedVaults = [...this.internalArchivedVaults.value];

        tempArchivedVaults.splice(index, 1);
        tempUserVaults.push({
            name: vaultData.name,
            userVaultID: vaultData.userVaultID,
            lastUsed: selected
        });

        // force reactivity. For some reason it doesn't work otherwise
        this.internalUserVaults.value = tempUserVaults;
        this.internalArchivedVaults.value = tempArchivedVaults;

        if (selected)
        {
            await this.internalCurrentVault.setReactiveVaultStoreData(masterKey, vaultData)
        }

        return true;
    }

    async permanentlyDeleteVault(masterKey: string, userVaultID: number): Promise<boolean>
    {
        const index = this.archivedVaults.value.findIndex(v => v.userVaultID == userVaultID);
        if (index == -1)
        {
            return false;
        }

        const response = await api.server.vault.deleteVault(userVaultID);
        if (!response)
        {
            return false;
        }

        const tempArchivedVaults = [...this.internalArchivedVaults.value];
        tempArchivedVaults.splice(index, 1);

        this.internalArchivedVaults.value = tempArchivedVaults;

        const selected = this.currentVault.userVaultID == userVaultID;
        if (selected)
        {
            await this.setActiveVault(masterKey, this.internalUserVaults.value[0].userVaultID!);
            this.emit('onVaultActive', this.internalUserVaults.value[0].userVaultID);
        }

        return true;
    }

    async setActiveVault(masterKey: string, userVaultID: number): Promise<boolean>
    {
        const response = await api.repositories.vaults.setActiveVault(masterKey, userVaultID);
        if (!response.success)
        {
            defaultHandleFailedResponse(response)
            return false;
        }

        await this.internalCurrentVault.setReactiveVaultStoreData(masterKey, response.value!);
        return true;
    }

    public shareToVault<T>(value: T, toVault: number)
    {

    }

    public async updateColorPalette(masterKey: string, colorPalette: ColorPalette): Promise<void>
    {
        const transaction = new StoreUpdateTransaction();
        const pendingState = this.cloneState();

        const oldColorPalette: Field<ColorPalette> | undefined = pendingState.settings.value.colorPalettes.value.get(colorPalette.id.value);
        if (!oldColorPalette)
        {
            return Promise.resolve();
        }

        oldColorPalette.value = colorPalette;
        if (this.internalUsersPreferencesStore.currentColorPalette.id.value == oldColorPalette.value.id.value)
        {
            this.internalUsersPreferencesStore.updateCurrentColorPalette(transaction, oldColorPalette.value);
        }

        transaction.updateUserStore(this, pendingState);
        await transaction.commit(masterKey);
    }
}

const app = new AppStore();
export default app;