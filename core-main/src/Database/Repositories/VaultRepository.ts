import { environment } from "../../Environment";
import { Vault } from "../Entities/Vault";
import { CondensedVaultData } from "../../Types/Repositories";
import { Repository } from "typeorm";
import { VaulticRepository } from "./VaulticRepository";
import vaulticServer from "../../Server/VaulticServer";
import { UserVault } from "../Entities/UserVault";
import Transaction from "../Transaction";
import { VaultPreferencesStoreState } from "../Entities/States/VaultPreferencesStoreState";
import { VaultStoreState } from "../Entities/States/VaultStoreState";
import { PasswordStoreState } from "../Entities/States/PasswordStoreState";
import { ValueStoreState } from "../Entities/States/ValueStoreState";
import { FilterStoreState } from "../Entities/States/FilterStoreState";
import { GroupStoreState } from "../Entities/States/GroupStoreState";

class VaultRepository extends VaulticRepository<Vault>
{
    protected getRepository(): Repository<Vault> | undefined
    {
        return environment.databaseDataSouce.getRepository(Vault);
    }

    public async createNewVault(name: string, color: string = '#FFFFFF'): Promise<boolean | [UserVault, Vault]>
    {
        // TODO: what happens if we fail to re back these up after creating them? There will then be pointless records on the server
        // Create an initalized property on the userVault on server and default to false. Once it has been backed up once, set to true.
        // Have scheduled task to remove all userVaults with initalized is false for more than a day
        const response = await vaulticServer.vault.create();
        if (!response.Success)
        {
            return false;
        }

        const userVault = new UserVault();
        userVault.vaultPreferencesStoreState = new VaultPreferencesStoreState();

        const vault = new Vault();
        userVault.vault = vault;

        vault.lastUsed = true;
        vault.name = name;
        vault.color = color;
        vault.vaultStoreState = new VaultStoreState();
        vault.passwordStoreState = new PasswordStoreState();
        vault.valueStoreState = new ValueStoreState();
        vault.filterStoreState = new FilterStoreState();
        vault.groupStoreState = new GroupStoreState();

        userVault.userVaultID = response.UserVaultID!;
        userVault.vaultPreferencesStoreState.vaultPreferencesStoreStateID = response.VaultPreferencesStoreStateID!;
        vault.vaultID = response.VaultID!;
        vault.vaultStoreState.vaultStoreStateID = response.VaultStoreStateID!;
        vault.passwordStoreState.passwordStoreStateID = response.PasswordStoreStateID!;
        vault.valueStoreState.valueStoreStateID = response.ValueStoreStateID!;
        vault.filterStoreState.filterStoreStateID = response.FilterStoreStateID!;
        vault.groupStoreState.groupStoreStateID = response.GroupStoreStateID!;

        return [userVault, vault];
    }

    public async getVault(masterKey: string, userVaultID: number): Promise<CondensedVaultData | null>
    {
        const userVaults = await environment.repositories.userVaults.getVerifiedAndDecryt(masterKey, undefined, userVaultID);
        if (userVaults && userVaults.length == 1)
        {
            return userVaults[0]
        }

        return null;
    }

    public async saveAndBackup(masterKey: string, userVaultID: number, data: string, skipBackup: boolean = false)
    {
        const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, userVaultID);
        if (userVaults[0].length == 0)
        {
            return false;
        }

        const oldUserVault = userVaults[0][0];
        const vaultKey = userVaults[1][0];

        const newVault = JSON.parse(data);
        oldUserVault.copyFrom(newVault);

        const succeeded = await oldUserVault.encryptAndSetFromObject!(vaultKey, newVault);
        if (!succeeded)
        {
            return false;
        }

        const transaction = new Transaction();
        transaction.updateEntity(oldUserVault, vaultKey, () => this);

        const saved = await transaction.commit();
        if (!saved)
        {
            return false;
        }

        // TODO: this should be done seperatly. not being able to backup shouldn't be considered the same 
        // as an error while saving
        if (!skipBackup)
        {
            const backupResponse = await vaulticServer.user.backupData(undefined, undefined, [oldUserVault.getBackup()]);
            if (!backupResponse.Success)
            {
                //return JSON.stringify(backupResponse);
            }
        }

        return true;
    }
}

const vaultRepository: VaultRepository = new VaultRepository();
export default vaultRepository;
export type VaultRepositoryType = typeof vaultRepository;