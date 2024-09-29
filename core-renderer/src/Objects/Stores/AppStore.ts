import { Ref, ref, ComputedRef, computed } from "vue";
import { DataType, FilterStatus } from "../../Types/Table"
import { hideAll } from 'tippy.js';
import { Store } from "./Base";
import { AccountSetupView } from "../../Types/Models";
import { api } from "../../API"
import StoreUpdateTransaction, { Entity } from "../StoreUpdateTransaction";
import { ColorPalette, colorPalettes } from "../../Types/Colors";
import { AutoLockTime } from "../../Types/Settings";
import { BasicVaultStore, ReactiveVaultStore } from "./VaultStore";
import { CondensedVaultData, DisplayVault } from "../../Types/APITypes";
import { UserPreferencesStore } from "./UserPreferencesStore";
import { UserDataBreachStore } from "./UserDataBreachStore";
import { createPopupStore, PopupStore } from "./PopupStore";
import { UserData } from "../../Types/SharedTypes";

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

export class AppStore extends Store<AppStoreState>
{
    private loadedUser: boolean;
    private autoLockTimeoutID: NodeJS.Timeout | undefined;

    private internalActivePasswordValueTable: Ref<DataType> = ref(DataType.Passwords);
    private internalActiveFilterGroupTable: Ref<DataType> = ref(DataType.Filters);

    private internalAutoLockNumberTime: ComputedRef<number>;

    private internalIsOnline: Ref<boolean>;

    private internalUserVaults: Ref<DisplayVault[]>;
    private internalSharedVaults: Ref<BasicVaultStore[]>;
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
                oldPasswordDays: 30,
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

    public async updateSettings(masterKey: string, settings: AppSettings): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(Entity.User);
        transaction.addStore(this, { settings });

        return transaction.commit(masterKey);
    }

    public lock(redirect: boolean = true, expireSession: boolean = true)
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

    // TODO: resposne should contain all vaults from server to check if any local ones are out of date. It should also contain 
    // shared and archived vaults to set in the store only but not save locally
    public async loadUserData(masterKey: string, response?: any)
    {
        if (this.loadedUser)
        {
            return;
        }

        const userData = await api.repositories.users.getCurrentUserData(masterKey);
        const parsedUserData: UserData = JSON.parse(userData);

        // TODO: better handle error. No data will be loaded
        if (!parsedUserData.success)
        {
            return false;
        }

        Object.assign(this.state, JSON.parse(parsedUserData.appStoreState));
        this.internalUserVaults.value = parsedUserData.displayVaults!;
        // TODO: return shared vaults from server. These also need to include userVault for vaultKey...
        //this.internalSharedVaults = JSON.parse(response.SharedVaults);
        // this.internalArchivedVaults = JSON.parse(response.archivedVaults);
        this.internalCurrentVault.setVaultData(masterKey, parsedUserData.currentVault);
        this.internalUsersPreferencesStore.updateState(JSON.parse(parsedUserData.userPreferencesStoreState));
        this.loadedUser = true;
    }

    async createNewVault(masterKey: string, name: string, setAsActive: boolean)
    {
        const result = await api.repositories.vaults.createNewVaultForUser(masterKey, name, setAsActive, this.isOnline);
        if (!result)
        {
            return false;
        }

        const vaultData = result as CondensedVaultData;
        if (setAsActive)
        {
            this.internalCurrentVault.setVaultData(masterKey, vaultData);
        }

        // force trigger reactivity
        const temp = [...this.internalUserVaults.value];
        temp.push({
            userVaultID: vaultData.userVaultID,
            name: vaultData.name,
            color: vaultData.color,
            lastUsed: setAsActive
        });

        this.internalUserVaults.value = temp;
        return true;
    }

    async setActiveVault(masterKey: string, userVaultID: number): Promise<boolean>
    {
        // TODO: needs to set last used on the vault as well
        const vault = await api.repositories.vaults.setActiveVault(masterKey, userVaultID);
        if (!vault)
        {
            // TODO: handle
            return false;
        }

        this.internalCurrentVault.setVaultData(masterKey, vault as CondensedVaultData);
        return true;
    }

    public shareToVault<T>(value: T, toVault: number)
    {

    }

    public async updateColorPalette(masterKey: string, colorPalette: ColorPalette): Promise<void>
    {
        const transaction = new StoreUpdateTransaction(Entity.User);
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

        transaction.addStore(this, pendingState);
        await transaction.commit(masterKey);
    }
}

const app = new AppStore();
export default app;