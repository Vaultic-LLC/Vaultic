import { Ref, ref, ComputedRef, computed, watch } from "vue";
import { hideAll } from 'tippy.js';
import { Store, StoreEvents, StoreState } from "./Base";
import { AccountSetupView } from "../../Types/Models";
import { api } from "../../API"
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { ColorPalette, defaultColorPalettes, emptyUserColorPalettes } from "../../Types/Colors";
import { AppView, AutoLockTime } from "../../Types/App";
import { ReactiveVaultStore } from "./VaultStore";
import { UserPreferencesStore } from "./UserPreferencesStore";
import { VaultDataBreachStore } from "./VaultDataBreachStore";
import { createPopupStore, PopupStore } from "./PopupStore";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";
import { DisplayVault, UserData, VaultType, getVaultType } from "@vaultic/shared/Types/Entities";
import { FilterStatus, DataType } from "../../Types/DataTypes";
import { Field, IFieldedObject, KnownMappedFields } from "@vaultic/shared/Types/Fields";
import { DeviceStore } from "./DeviceStore";
import { OrganizationStore } from "./OrganizationStore";
import { Member, Organization } from "@vaultic/shared/Types/DataTypes";
import { UpdateVaultData } from "@vaultic/shared/Types/Repositories";
import { PasswordStoreState } from "./PasswordStore";

export interface AppSettings extends IFieldedObject
{
    userColorPalettes: Field<Map<string, Field<ColorPalette>>>;
    autoLockTime: Field<AutoLockTime>;
    multipleFilterBehavior: Field<FilterStatus>;
    oldPasswordDays: Field<number>;
    percentMetricForPulse: Field<number>;
    randomValueLength: Field<number>;
    randomPhraseLength: Field<number>;
    includeNumbersInRandomPassword: Field<boolean>;
    includeNumbersInRandomPassphrase: Field<boolean>;
    includeSpecialCharactersInRandomPassword: Field<boolean>;
    includeSpecialCharactersInRandomPassphrase: Field<boolean>;
    includeAmbiguousCharactersInRandomPassword: Field<boolean>;
    passphraseSeperator: Field<string>;
}

export interface IAppStoreState extends StoreState
{
    settings: Field<AppSettings>;
}

export type AppStoreState = KnownMappedFields<IAppStoreState>;

export type AppStoreEvents = StoreEvents | "onVaultUpdated" | "onVaultActive";

export class AppStore extends Store<AppStoreState, AppStoreEvents>
{
    private internaLoadedUser: Ref<boolean>;
    private autoLockTimeoutID: NodeJS.Timeout | undefined;

    private internalActiveAppView: Ref<AppView> = ref(AppView.Vault);
    private internalIsVaultView: ComputedRef<boolean> = computed(() => this.internalActiveAppView.value == AppView.Vault);

    private internalActivePasswordValueTable: Ref<DataType> = ref(DataType.Passwords);
    private internalActiveFilterGroupTable: Ref<DataType> = ref(DataType.Filters);
    private internalActiveDeviceOrganizationTable: Ref<DataType> = ref(DataType.Devices);

    private internalAutoLockNumberTime: ComputedRef<number>;

    private internalIsOnline: Ref<boolean>;

    private internalColorPalettes: ComputedRef<Field<ColorPalette>[]>;

    private internalUserVaults: Ref<DisplayVault[]>;
    private internalUserVaultsByVaultID: ComputedRef<Map<number, DisplayVault>>;
    private internalSortedUserVaultsIndexByVaultID: ComputedRef<Map<number, number>>;
    private internalSharedWithUserVaults: ComputedRef<DisplayVault[]>;
    private internalArchivedVaults: ComputedRef<DisplayVault[]>;

    private internalPrivateVaults: ComputedRef<DisplayVault[]>;
    private internalSharedWithOthersVaults: ComputedRef<DisplayVault[]>;

    private internalCurrentVault: ReactiveVaultStore;

    private internalUsersPreferencesStore: UserPreferencesStore;
    private internalVaultDataBreachStore: VaultDataBreachStore;
    private internalDeviceStore: DeviceStore;
    private internalOrganizationStore: OrganizationStore;
    private internalPopupStore: PopupStore;

    get loadedUser() { return this.internaLoadedUser; }
    get settings() { return this.state.settings; }
    get isOnline() { return this.internalIsOnline.value; }
    set isOnline(value: boolean) { this.internalIsOnline.value = value; }
    get activeAppView() { return this.internalActiveAppView.value; }
    set activeAppView(value: AppView) { this.internalActiveAppView.value = value; }
    get isVaultView() { return this.internalIsVaultView.value; }
    get activePasswordValuesTable() { return this.internalActivePasswordValueTable.value; }
    set activePasswordValuesTable(value: DataType) { this.internalActivePasswordValueTable.value = value; }
    get activeFilterGroupsTable() { return this.internalActiveFilterGroupTable.value; }
    set activeFilterGroupsTable(value: DataType) { this.internalActiveFilterGroupTable.value = value; }
    get activeDeviceOrganizationsTable() { return this.internalActiveDeviceOrganizationTable.value }
    set activeDeviceOrganizationsTable(value: DataType) { this.internalActiveDeviceOrganizationTable.value = value }
    get colorPalettes() { return this.internalColorPalettes.value; }
    get userVaults() { return this.internalUserVaults; }
    get userVaultsByVaultID() { return this.internalUserVaultsByVaultID.value }
    get sortedUserVaultIndexByVaultID() { return this.internalSortedUserVaultsIndexByVaultID.value }
    get sharedWithUserVaults() { return this.internalSharedWithUserVaults; }
    get archivedVaults() { return this.internalArchivedVaults; }
    get privateVaults() { return this.internalPrivateVaults; }
    get sharedWithOthersVaults() { return this.internalSharedWithOthersVaults; }
    get currentVault() { return this.internalCurrentVault; }
    get userPreferences() { return this.internalUsersPreferencesStore; }
    get vaultDataBreaches() { return this.internalVaultDataBreachStore; }
    get devices() { return this.internalDeviceStore; }
    get organizations() { return this.internalOrganizationStore; }
    get popups() { return this.internalPopupStore; }

    constructor()
    {
        super("appStoreState");

        this.internaLoadedUser = ref(false);
        this.internalVaultDataBreachStore = new VaultDataBreachStore();
        this.internalDeviceStore = new DeviceStore();
        this.internalOrganizationStore = new OrganizationStore();
        this.internalPopupStore = createPopupStore();

        this.internalColorPalettes = computed(() => [...defaultColorPalettes.valueArray(), ...this.state.settings.value.userColorPalettes.value.valueArray()])

        this.internalUserVaults = ref([]);
        this.internalUserVaultsByVaultID = computed(() => this.internalUserVaults.value.reduce((map: Map<number, DisplayVault>, dv: DisplayVault) =>
        {
            map.set(dv.vaultID, dv);
            return map;
        }, new Map()));

        this.internalSortedUserVaultsIndexByVaultID = computed(() => this.internalUserVaults.value
            .sort((a, b) => a.name >= b.name ? 1 : -1)
            .reduce((map: Map<number, number>, dv: DisplayVault, idx: number) =>
            {
                map.set(dv.vaultID, idx);
                return map;
            }, new Map()));

        this.internalCurrentVault = new ReactiveVaultStore();

        this.internalPrivateVaults = computed(() => this.userVaults.value.filter(v => v.type == VaultType.Private));
        this.internalSharedWithOthersVaults = computed(() => this.userVaults.value.filter(v => v.type == VaultType.SharedWithOthers));
        this.internalSharedWithUserVaults = computed(() => this.internalUserVaults.value.filter(v => v.type == VaultType.SharedWithUser));
        this.internalArchivedVaults = computed(() => this.internalUserVaults.value.filter(v => v.isArchived));

        // done after current vault so we can watch for userVaultID
        this.internalUsersPreferencesStore = new UserPreferencesStore();

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
                userColorPalettes: new Field(emptyUserColorPalettes),
                autoLockTime: new Field(AutoLockTime.OneMinute),
                multipleFilterBehavior: new Field(FilterStatus.Or),
                oldPasswordDays: new Field(365),
                percentMetricForPulse: new Field(1),
                randomValueLength: new Field(25),
                randomPhraseLength: new Field(7),
                includeNumbersInRandomPassword: new Field(true),
                includeNumbersInRandomPassphrase: new Field(true),
                includeSpecialCharactersInRandomPassword: new Field(true),
                includeSpecialCharactersInRandomPassphrase: new Field(true),
                includeAmbiguousCharactersInRandomPassword: new Field(true),
                passphraseSeperator: new Field('-')
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
        this.internalVaultDataBreachStore.resetToDefault();
        this.internalDeviceStore.resetToDefault();
        this.internalOrganizationStore.resetToDefault();

        this.internalUserVaults.value = [];
        this.internalCurrentVault.resetToDefault();

        await api.cache.clear();

        this.isOnline = false;
        this.internaLoadedUser.value = false;
    }

    public resetSessionTime()
    {
        clearTimeout(this.autoLockTimeoutID);
        this.autoLockTimeoutID = setTimeout(() =>
        {
            console.log('auto lock app');
            this.lock();
        }, this.internalAutoLockNumberTime.value);
    }

    public async loadUserData(masterKey: string)
    {
        if (this.internaLoadedUser.value)
        {
            return false;
        }

        const success = await this.internalLoadUserData(masterKey);
        if (!success)
        {
            return false;
        }

        this.internaLoadedUser.value = true;
        this.internalActiveAppView.value = AppView.Vault;

        // don't bother waiting for these, just trigger them so they are there if we need them
        app.devices.getDevices();
        app.organizations.getOrganizations();

        return true;
    }

    async createNewVault(masterKey: string, name: string, shared: boolean, setAsActive: boolean,
        addedOrganizations: Organization[], addedMembers: Member[])
    {
        const result = await api.repositories.vaults.createNewVaultForUser(masterKey, name, shared, setAsActive,
            addedOrganizations, addedMembers, this.isOnline);

        if (!result.success)
        {
            defaultHandleFailedResponse(result);
            return false;
        }

        const vaultData = result.value!;
        this.organizations.updateOrgsForVault(vaultData.userVaultID, addedOrganizations, []);

        if (setAsActive)
        {
            await this.internalCurrentVault.setReactiveVaultStoreData(masterKey, vaultData);
            this.internalActiveAppView.value = AppView.Vault;
        }

        // force trigger reactivity
        const temp = [...this.internalUserVaults.value];
        temp.push({
            userOrganizationID: vaultData.userOrganizationID,
            userVaultID: vaultData.userVaultID,
            vaultID: vaultData.vaultID,
            name: vaultData.name,
            shared: vaultData.shared,
            isArchived: vaultData.isArchived,
            isOwner: vaultData.isOwner,
            isReadOnly: vaultData.isReadOnly,
            lastUsed: setAsActive,
            type: getVaultType(vaultData),
            passwordsByDomain: (JSON.vaulticParse(vaultData.passwordStoreState) as PasswordStoreState).passwordsByDomain
        });

        this.internalUserVaults.value = temp;
        return true;
    }

    async updateVault(masterKey: string, displayVault: DisplayVault, shared: boolean, addedOrganizations: Organization[],
        removedOrganizations: Organization[], addedMembers: Member[], updatedMembers: Member[], removedMembers: Member[]):
        Promise<boolean>
    {
        const updateVaultData: UpdateVaultData =
        {
            userVaultID: displayVault.userVaultID!,
            name: displayVault.name,
            shared: shared,
            addedOrganizations: addedOrganizations,
            removedOrganizations: removedOrganizations,
            addedMembers: addedMembers,
            updatedMembers: updatedMembers,
            removedMembers: removedMembers,
        };

        const success = await api.repositories.vaults.updateVault(masterKey, JSON.vaulticStringify(updateVaultData), this.isOnline);
        if (!success)
        {
            return false;
        }

        this.organizations.updateOrgsForVault(displayVault.vaultID, addedOrganizations, removedOrganizations);

        const index = this.userVaults.value.findIndex(uv => uv.userVaultID == displayVault.userVaultID);
        if (index == -1)
        {
            return false;
        }

        if (displayVault.shared != shared)
        {
            displayVault.shared = shared;
            displayVault.type = shared ? VaultType.SharedWithOthers : VaultType.Private;
        }

        this.userVaults.value[index] = displayVault;
        this.emit("onVaultUpdated", displayVault);

        return true;
    }

    async updateArchiveStatus(masterKey: string, userVaultID: number, isArchived: boolean): Promise<boolean>
    {
        const updateVaultData: UpdateVaultData =
        {
            userVaultID: userVaultID,
            isArchived: isArchived
        };

        const response = await api.repositories.vaults.updateVault(masterKey, JSON.vaulticStringify(updateVaultData), app.isOnline);
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

        this.userVaults.value[index].isArchived = isArchived;
        this.userVaults.value[index].type = getVaultType(this.userVaults.value[index]);

        return true;
    }

    async permanentlyDeleteVault(masterKey: string, userVaultID: number): Promise<boolean>
    {
        const index = this.userVaults.value.findIndex(v => v.userVaultID == userVaultID);
        if (index == -1)
        {
            return false;
        }

        const response = await api.repositories.vaults.deleteVault(masterKey, userVaultID);
        if (!response.success)
        {
            return false;
        }

        const tempArchivedVaults = [...this.internalUserVaults.value];
        tempArchivedVaults.splice(index, 1);

        this.internalUserVaults.value = tempArchivedVaults;

        const selected = this.currentVault.userVaultID == userVaultID;
        if (selected)
        {
            await this.setActiveVault(masterKey, this.internalUserVaults.value[0].userVaultID!);
            this.emit('onVaultActive', this.internalUserVaults.value[0].userVaultID);
        }

        return true;
    }

    async loadSharedVault(masterKey: string, userVaultID: number): Promise<boolean>
    {
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
        this.internalActiveAppView.value = AppView.Vault;

        return true;
    }

    async syncVaults(masterKey: string): Promise<boolean>
    {
        const result = await api.repositories.vaults.syncVaults(masterKey);
        if (!result.success)
        {
            return false;
        }

        return await this.internalLoadUserData(masterKey);
    }

    // TODO: post release
    public shareToVault<T>(value: T, toVault: number)
    {

    }

    public async updateColorPalette(masterKey: string, colorPalette: ColorPalette): Promise<void>
    {
        const transaction = new StoreUpdateTransaction();
        const pendingState = this.cloneState();

        const oldColorPalette: Field<ColorPalette> | undefined = pendingState.settings.value.userColorPalettes.value.get(colorPalette.id.value);
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

    private async internalLoadUserData(masterKey: string): Promise<boolean>
    {
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

        await this.internalCurrentVault.setReactiveVaultStoreData(masterKey, parsedUserData.currentVault!);
        return true;
    }
}

const app = new AppStore();
app.userPreferences.init(app);

export default app;