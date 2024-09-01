import { environment } from "../../Environment";
import { Vault } from "../Entities/Vault";
import { VaultData } from "../../Types/Repositories";
import { Repository } from "typeorm";
import { VaulticRepository } from "./VaulticRepositoryInitalizer";
import vaulticServer from "../../Server/VaulticServer";
import { UserVault } from "../Entities/UserVault";
import { VaultKey } from "../../Types/Properties";
import Transaction from "../Transaction";
import { VaultPreferencesStoreState } from "../Entities/States/VaultPreferencesStoreState";
import { VaultStoreState } from "../Entities/States/VaultStoreState";
import { PasswordStoreState } from "../Entities/States/PasswordStoreState";
import { ValueStoreState } from "../Entities/States/ValueStoreState";
import { FilterStoreState } from "../Entities/States/FilterStoreState";
import { GroupStoreState } from "../Entities/States/GroupStoreState";
import { CreateVaultResponse } from "../../Types/Responses";

class VaultRepository extends VaulticRepository<Vault>
{
    protected getRepository(): Repository<Vault> | undefined
    {
        return environment.databaseDataSouce.getRepository(Vault);
    }

    public async createNewVault(name: string, color: string = '#FFFFFF', response?: CreateVaultResponse): Promise<boolean | [UserVault, Vault]>
    {
        const userVault = new UserVault();
        userVault.vaultPreferencesStoreState = new VaultPreferencesStoreState();;

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

        if (response)
        {
            userVault.userVaultID = response.UserVaultID!;
            userVault.vaultPreferencesStoreState.vaultPreferencesStoreStateID = response.VaultPreferencesStoreStateID!;
            vault.vaultID = response.VaultID!;
            vault.vaultStoreState.vaultStoreStateID = response.VaultStoreStateID!;
            vault.passwordStoreState.passwordStoreStateID = response.PasswordStoreStateID!;
            vault.valueStoreState.valueStoreStateID = response.ValueStoreStateID!;
            vault.filterStoreState.filterStoreStateID = response.FilterStoreStateID!;
            vault.groupStoreState.groupStoreStateID = response.GroupStoreStateID!;
        }

        return [userVault, vault];
    }

    public async getVault(masterKey: string, vaultID: number): Promise<VaultData | null>
    {
        const vault = await this.getVaults(masterKey, ["vaultID", "lastUsed"],
            ["name", "color", "vaultStoreState", "passwordStoreState",
                "valueStoreState", "filterStoreState", "groupStoreState"], vaultID);

        const currentUser = environment.repositories.users.getCurrentUser();

        if (vault[0].length == 1)
        {
            const userVault = vault[0][0].userVaults?.filter(uv => uv.userID == currentUser?.userID);
            // @ts-ignore
            return { ...vault[0][0], userPreferencesStoreState: userVault[0].vaultPreferencesStoreState } as VaultData;
        }

        return null;
    }

    public async saveAndBackup(masterKey: string, vaultID: number, data: string, skipBackup: boolean = false)
    {
        const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, vaultID);
        if (userVaults[0].length == 0)
        {
            return false;
        }

        const oldUserVault = userVaults[0][0];
        const vaultKey = userVaults[1][0];

        const newVault = JSON.parse(data);
        // TODO: not sure this works for nested objects?
        Object.assign(oldUserVault, newVault);

        // TODO: this won't work any more
        const succeeded = await oldUserVault.encryptAndSetEach!(vaultKey, Object.keys(newVault));
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