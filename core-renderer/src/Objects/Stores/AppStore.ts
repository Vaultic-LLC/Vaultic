// App store is the first main thing that loads
import * as PolyFills from "@vaultic/shared/Types/PolyFills";
PolyFills.a;

import { Ref, ref, ComputedRef, computed, watch } from "vue";
import { hideAll } from 'tippy.js';
import { Store, StoreEvents } from "./Base";
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
import { DisplayVault, IUser, UserData, VaultType, getVaultType } from "@vaultic/shared/Types/Entities";
import { FilterStatus, DataType } from "../../Types/DataTypes";
import { DeviceStore } from "./DeviceStore";
import { OrganizationStore } from "./OrganizationStore";
import { Member, Organization } from "@vaultic/shared/Types/DataTypes";
import { UpdateVaultData } from "@vaultic/shared/Types/Repositories";
import { PasswordStoreState } from "./PasswordStore";
import { LicenseStatus } from "@vaultic/shared/Types/ClientServerTypes";
import { PendingStoreState, StateKeys, StorePathRetriever, StoreState, StoreType } from "@vaultic/shared/Types/Stores";

export interface AppSettings
{
    /** User Color Palettes */
    c: { [key: string]: ColorPalette };
    /** Auto Lock Time */
    a: AutoLockTime;
    /** Multiple Filter Behavior */
    f: FilterStatus;
    /** Old Password Days */
    o: number;
    /** Percent Metric For Pulse */
    p: number;
    /** Random Value Length */
    v: number;
    /** Random Phrase Lengh */
    r: number;
    /** Include Numbers In Random Password */
    n: boolean;
    /** Include Special Characters In random Password */
    s: boolean;
    /** Include Ambiguous Charactesr in Random Password */
    m: boolean;
    /** Passphrase Seperator */
    e: string;
}

export interface IAppStoreState extends StoreState
{
    /** Settings */
    s: AppSettings;
}

export interface AppStoreStateKeys extends StateKeys
{
    "settings": "";
    "colorPalettes.palette": "";
    "colorPalette.passwordColors": "";
    "colorPalette.valueColors": "";
}

const AppStorePathRetriever: StorePathRetriever<AppStoreStateKeys> =
{
    'settings': (...ids: string[]) => `s`,
    'colorPalettes.palette': (...ids: string[]) => `s.c.${ids[0]}`,
    'colorPalette.passwordColors': (...ids: string[]) => `s.c.${ids[0]}.p`,
    'colorPalette.valueColors': (...ids: string[]) => `s.c.${ids[0]}.v`
};

export type AppStoreState = IAppStoreState;

export type AppStoreEvents = StoreEvents | "onVaultUpdated" | "onVaultActive";

export class AppStore extends Store<AppStoreState, AppStoreStateKeys, AppStoreEvents>
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

    private internalColorPalettes: ComputedRef<ColorPalette[]>;

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

    private internalUserInfo: Ref<Partial<IUser> | undefined>;
    private internalCanShowSubscriptionWidgets: ComputedRef<boolean>;
    private internalUserLicense: Ref<LicenseStatus>;

    private lastSessionExtendTime: number;
    private internalActiveDataType: ComputedRef<DataType>;

    get loadedUser() { return this.internaLoadedUser; }
    get settings() { return this.state.s; }
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
    get userInfo() { return this.internalUserInfo.value; }
    get canShowSubscriptionWidgets() { return this.internalCanShowSubscriptionWidgets; }
    get userLicense() { return this.internalUserLicense.value; }
    get activeDataType() { return this.internalActiveDataType.value; }

    constructor()
    {
        super(StoreType.App, AppStorePathRetriever);

        this.internaLoadedUser = ref(false);
        this.internalVaultDataBreachStore = new VaultDataBreachStore();
        this.internalDeviceStore = new DeviceStore();
        this.internalOrganizationStore = new OrganizationStore();
        this.internalPopupStore = createPopupStore();

        this.internalColorPalettes = computed(() => defaultColorPalettes.valueArray().concat(Object.values(this.state.s.c)));

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

        this.internalUserInfo = ref(undefined);
        this.internalCanShowSubscriptionWidgets = computed(() => this.isOnline && this.internalUserLicense.value == LicenseStatus.Active);
        this.internalUserLicense = ref(LicenseStatus.Unknown);

        this.internalAutoLockNumberTime = computed(() => this.calcAutolockTime(this.state.s.a));

        watch(() => this.internalAutoLockNumberTime.value, (newValue) => 
        {
            this.resetSessionTime();
        });

        this.lastSessionExtendTime = Date.now();
        this.internalActiveDataType = computed(() => app.isVaultView ? app.activePasswordValuesTable : app.activeDeviceOrganizationsTable);
    }

    protected defaultState()
    {
        return {
            version: 0,
            s: {
                c: emptyUserColorPalettes,
                a: AutoLockTime.OneMinute,
                f: FilterStatus.Or,
                o: 365,
                p: 1,
                v: 25,
                r: 7,
                n: true,
                s: true,
                m: true,
                e: '-',
                t: true
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
            this.internalPopupStore.showAccountSetup(AccountSetupView.SignIn, undefined, undefined, false);
        }

        if (expireSession && this.isOnline === true)
        {
            await api.server.session.expire();
        }

        await this.clearAllData();
    }

    async clearAllData()
    {
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

        this.popups.closeAllPopupsOnLock();
        this.isOnline = false;
        this.internaLoadedUser.value = false;

        this.internalUserInfo.value = undefined;
        this.internalUserLicense.value = LicenseStatus.Unknown;
    }

    public resetSessionTime()
    {
        clearTimeout(this.autoLockTimeoutID);
        this.autoLockTimeoutID = setTimeout(() =>
        {
            this.lock();
        }, this.internalAutoLockNumberTime.value);

        // Extend session every 10 minutes
        if (this.loadedUser && this.isOnline && (Date.now() - this.lastSessionExtendTime) > 600000)
        {
            this.lastSessionExtendTime = Date.now();
            api.server.session.extend();
        }
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

        this.lastSessionExtendTime = Date.now();
        this.internaLoadedUser.value = true;
        this.internalActiveAppView.value = AppView.Vault;

        if (this.isOnline)
        {
            // don't bother waiting for these, just trigger them so they are there if we need them
            app.devices.getDevices();
            app.organizations.getOrganizations();
            this.getUserInfo();
        }

        const setMasterKeyResponse = await api.cache.setMasterKey(masterKey);
        if (!setMasterKeyResponse.success)
        {
            defaultHandleFailedResponse(setMasterKeyResponse);
        }

        return true;
    }

    async createNewVault(masterKey: string, name: string, shared: boolean, setAsActive: boolean,
        addedOrganizations: Organization[], addedMembers: Member[])
    {
        if (!this.isOnline)
        {
            return false;
        }

        const updateVaultData: UpdateVaultData =
        {
            name,
            shared,
            setAsActive,
            addedOrganizations,
            addedMembers
        };

        const result = await api.repositories.vaults.createNewVaultForUser(masterKey, JSON.vaulticStringify(updateVaultData));
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
        const temp = Array.from(this.internalUserVaults.value);
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
            passwordsByDomain: (JSON.vaulticParse(vaultData.passwordStoreState) as PasswordStoreState).o
        });

        this.internalUserVaults.value = temp;
        return true;
    }

    async updateVault(masterKey: string, displayVault: DisplayVault, shared: boolean, addedOrganizations: Organization[],
        removedOrganizations: Organization[], addedMembers: Member[], updatedMembers: Member[], removedMembers: Member[]):
        Promise<boolean>
    {
        if (!this.isOnline)
        {
            return false;
        }

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

        const success = await api.repositories.vaults.updateVault(masterKey, JSON.vaulticStringify(updateVaultData));
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
        if (!this.isOnline)
        {
            return false;
        }

        const updateVaultData: UpdateVaultData =
        {
            userVaultID: userVaultID,
            isArchived: isArchived
        };

        const response = await api.repositories.vaults.updateVault(masterKey, JSON.vaulticStringify(updateVaultData));
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
        if (!this.isOnline)
        {
            return false;
        }

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

        const tempArchivedVaults = Array.from(this.internalUserVaults.value);
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
        if (!this.isOnline)
        {
            return false;
        }

        const result = await api.repositories.vaults.syncVaults(masterKey);
        if (!result.success)
        {
            return false;
        }

        return await this.internalLoadUserData(masterKey);
    }

    public async updateColorPalette(
        masterKey: string,
        colorPalette: ColorPalette,
        pendingStorState: PendingStoreState<AppStoreState, AppStoreStateKeys>
    ): Promise<void>
    {
        const transaction = new StoreUpdateTransaction();
        let oldColorPalette: ColorPalette | undefined = pendingStorState.state.s.c[colorPalette.id];
        if (!oldColorPalette)
        {
            return;
        }

        pendingStorState.commitProxyObject("colorPalettes.palette", colorPalette, colorPalette.id);
        pendingStorState.commitProxyObject("colorPalette.passwordColors", colorPalette.p, colorPalette.id);
        pendingStorState.commitProxyObject("colorPalette.valueColors", colorPalette.v, colorPalette.id);

        if (this.internalUsersPreferencesStore.currentColorPalette.id == oldColorPalette.id)
        {
            this.internalUsersPreferencesStore.updateCurrentColorPalette(transaction, oldColorPalette);
        }

        transaction.updateUserStore(this, pendingStorState);
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

        this.internalUserInfo.value = parsedUserData.userInfo;
        await this.initalizeNewStateFromJSON(parsedUserData.appStoreState);
        await this.internalUsersPreferencesStore.initalizeNewStateFromJSON(parsedUserData.userPreferencesStoreState);

        this.internalUserVaults.value = parsedUserData.displayVaults!;

        await this.internalCurrentVault.setReactiveVaultStoreData(masterKey, parsedUserData.currentVault!);
        return true;
    }

    public async getUserInfo()
    {
        if (!app.isOnline)
        {
            return true;
        }

        const response = await api.server.user.getUserInfo();
        if (!response.success)
        {
            return false;
        }

        this.internalUserLicense.value = response.LicenseStatus!;
    }

    public async copyToClipboard(value: string)
    {
        // writing to the clipboard will fail if the dom isn't focused
        try
        {
            await navigator.clipboard.writeText(value);
            app.popups.showToast("Copied", true);
            setTimeout(function () 
            {
                // You can't write to cilpboard if the document doesn't have focus, i.e. the user is on another app
                // This is a workaround in order to clear the clipboard
                try 
                {
                    const tempElement = document.createElement("input");
                    tempElement.style.cssText = "width:0!important;padding:0!important;border:0!important;margin:0!important;outline:none!important;boxShadow:none!important;";
                    document.body.appendChild(tempElement);
                    tempElement.value = ' ' // Empty string won't work!
                    tempElement.select();
                    document.execCommand("copy");
                    document.body.removeChild(tempElement)
                }
                catch (e)  
                {
                    console.log(e);
                }
            }, 15000);
        }
        catch { }
    }
}

const app = new AppStore();
app.userPreferences.init(app);

export default app;