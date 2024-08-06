import { AppStoreType } from "./AppStore";
import { FilterStoreType } from "./FilterStore";
import { GroupStoreType } from "./GroupStore";
import { PasswordStoreType } from "./PasswordStore";
import { SettingStoreType } from "./SettingsStore";
import { ValueStoreType } from "./ValueStore";

interface Vault 
{
    settingsStore: SettingStoreType;
    appStore: AppStoreType;
    filterStore: FilterStoreType;
    groupStore: GroupStoreType;
    passwordStore: PasswordStoreType;
    valueStore: ValueStoreType;
    commitAndBackup: () => void;
}

interface VaultStoreState 
{
    vaults: Vault[];
    currentVault: Vault;
}

class VaultStore 
{
    private state: VaultStoreState;

    constructor() { }

    loadVault(masterKey: string, vaultID?: string)
    {

    }

    updateCurrentVaultWithBackups()
    {

    }

    unloadCurrentVault()
    {

    }

    share<T>(value: T, toVault: string)
    {

    }
}