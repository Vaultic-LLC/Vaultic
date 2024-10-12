import { Ref, ref, ComputedRef, computed } from "vue";
import { DataType, FilterStatus } from "../../Types/Table"
import { hideAll } from 'tippy.js';
import { Store, StoreEvents } from "./Base";
import { AccountSetupView } from "../../Types/Models";
import { api } from "../../API"
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { ColorPalette, colorPalettes } from "../../Types/Colors";
import { AutoLockTime } from "../../Types/Settings";
import { BasicVaultStore, ReactiveVaultStore } from "./VaultStore";
import { CondensedVaultData, DisplayVault } from "../../Types/APITypes";
import { UserPreferencesStore } from "./UserPreferencesStore";
import { UserDataBreachStore } from "./UserDataBreachStore";
import { createPopupStore, PopupStore } from "./PopupStore";
import { UserData } from "../../Types/SharedTypes";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";

export interface AppSettings 
{
    readonly rowChunkAmount: number;
    colorPalettes: ColorPalette[];
    autoLockTime: AutoLockTime;
    randomValueLength: number;
    randomPhraseLength: number;
    multipleFilterBehavior: FilterStatus;
    oldPasswordDays: number;
    percentMetricForPulse: number;
    defaultMarkdownInEditScreens: boolean;
}

export interface AppStoreState
{
    settings: AppSettings;
}

export type AppStoreEvents = StoreEvents | "onVaultUpdated" | "onVaultActive";

export class AppStore extends Store<AppStoreState, AppStoreEvents>
{
    private loadedUser: boolean;
    private autoLockTimeoutID: NodeJS.Timeout | undefined;

    private internalActivePasswordValueTable: Ref<DataType> = ref(DataType.Passwords);
    private internalActiveFilterGroupTable: Ref<DataType> = ref(DataType.Filters);

    private internalAutoLockNumberTime: ComputedRef<number>;

    private internalIsOnline: Ref<boolean>;

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
        this.internalUsersPreferencesStore = new UserPreferencesStore(this);
        this.internalUserDataBreachStore = new UserDataBreachStore();
        this.internalPopupStore = createPopupStore();

        this.internalUserVaults = ref([]);
        this.internalSharedVaults = ref([]);
        this.internalArchivedVaults = ref([]);
        this.internalCurrentVault = new ReactiveVaultStore();

        this.internalIsOnline = ref(false);
        this.internalActivePasswordValueTable = ref(DataType.Passwords);
        this.internalActiveFilterGroupTable = ref(DataType.Filters);

        this.internalAutoLockNumberTime = computed(() => this.calcAutolockTime(this.state.settings.autoLockTime));
    }

    protected defaultState()
    {
        return {
            version: 0,
            masterKeyHash: '',
            masterKeySalt: '',
            privateKey: '',
            isOnline: false,
            userDataVersion: 0,
            loginHistory: {},
            settings: {
                rowChunkAmount: 10,
                colorPalettes: colorPalettes,
                autoLockTime: AutoLockTime.OneMinute,
                randomValueLength: 25,
                randomPhraseLength: 7,
                multipleFilterBehavior: FilterStatus.Or,
                oldPasswordDays: 365,
                percentMetricForPulse: 1,
                defaultMarkdownInEditScreens: true
            }
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

    public async loadUserData(masterKey: string, payload?: any)
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

        const parsedUserData: UserData = JSON.parse(userData.value!);

        Object.assign(this.state, JSON.parse(parsedUserData.appStoreState));
        this.internalUserVaults.value = parsedUserData.displayVaults!;
        this.internalSharedVaults.value = payload?.sharedVaults?.map(v => new BasicVaultStore(v)) ?? [];
        this.internalArchivedVaults.value = payload?.archivedVaults?.map(v => new BasicVaultStore(v)) ?? [];
        this.internalCurrentVault.setReactiveVaultStoreData(masterKey, parsedUserData.currentVault);
        this.internalUsersPreferencesStore.updateState(JSON.parse(parsedUserData.userPreferencesStoreState));
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
            this.internalCurrentVault.setReactiveVaultStoreData(masterKey, vaultData);
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
        const success = await api.repositories.vaults.saveVault(masterKey, displayVault.userVaultID, JSON.stringify(displayVault), this.isOnline);
        if (!success)
        {
            return false;
        }

        const index = this.userVaults.value.findIndex(uv => uv.userVaultID == displayVault.userVaultID);
        if (index == -1)
        {
            return false;
        }

        this.userVaults[index] = displayVault;
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
            if (!vaultData)
            {
                return false;
            }

            archivedVault[0].setBasicVaultStoreData(vaultData as CondensedVaultData);
        }

        this.internalCurrentVault.setVaultDataFromBasicVault(masterKey, archivedVault[0], false, true);
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
        let vaultData = await api.helpers.vault.unarchiveVault(masterKey, userVaultID, selected);

        if (!vaultData)
        {
            return false;
        }

        vaultData = vaultData as CondensedVaultData;

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
            this.internalCurrentVault.setReactiveVaultStoreData(masterKey, vaultData)
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
            await this.setActiveVault(masterKey, this.internalUserVaults.value[0].userVaultID);
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

        this.internalCurrentVault.setReactiveVaultStoreData(masterKey, response.value!);
        return true;
    }

    public shareToVault<T>(value: T, toVault: number)
    {

    }

    public async updateColorPalette(masterKey: string, colorPalette: ColorPalette): Promise<void>
    {
        const transaction = new StoreUpdateTransaction();
        const pendingState = this.cloneState();

        const oldColorPalette: ColorPalette[] = pendingState.settings.colorPalettes.filter(cp => cp.id == colorPalette.id);
        if (oldColorPalette.length != 1)
        {
            return Promise.resolve();
        }

        Object.assign(oldColorPalette[0], colorPalette);
        if (this.internalUsersPreferencesStore.currentColorPalette.id == oldColorPalette[0].id)
        {
            this.internalUsersPreferencesStore.updateCurrentColorPalette(transaction, oldColorPalette[0]);
        }

        transaction.updateUserStore(this, pendingState);
        await transaction.commit(masterKey);
    }
}

const app = new AppStore();
export default app;