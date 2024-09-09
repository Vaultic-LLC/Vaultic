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
import { EntityState } from "../../Types/Properties";
import { backupData } from ".";
import { nameof } from "../../Helpers/TypeScriptHelper";
import { StoreState } from "../Entities/States/StoreState";

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

    public async saveAndBackup(masterKey: string, userVaultID: number, data: string, backup: boolean)
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
        oldUserVault.entityState = EntityState.Updated;

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

        if (backup)
        {
            await backupData(masterKey);
        }

        return true;
    }

    public async getEntitiesThatNeedToBeBackedUp(masterKey: string): Promise<[boolean, Partial<Vault>[] | null]> 
    {
        const currentUser = environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            return [false, null];
        }

        let vaultsToBackup = await this.retrieveAndVerifyAll(masterKey, getVaults);
        if (!vaultsToBackup)
        {
            return [false, null];
        }

        vaultsToBackup = vaultsToBackup as Vault[];
        if (vaultsToBackup.length == 0)
        {
            return [true, null];
        }

        const partialVaultsToBackup: Partial<Vault>[] = [];

        for (let i = 0; i < vaultsToBackup.length; i++)
        {
            const vaultBackup = {};
            const vault = vaultsToBackup[i];

            if (vault.updatedProperties.length > 0)
            {
                Object.assign(vaultBackup, vault.getBackup());
            }
            else 
            {
                vaultBackup["vaultID"] = vault.vaultID;
            }

            if (vault.vaultStoreState.updatedProperties.length > 0)
            {
                vaultBackup["vaultStoreState"] = vault.vaultStoreState.getBackup();
            }

            if (vault.passwordStoreState.updatedProperties.length > 0)
            {
                vaultBackup["passwordStoreState"] = vault.passwordStoreState.getBackup();
            }

            if (vault.valueStoreState.updatedProperties.length > 0)
            {
                vaultBackup["valueStoreState"] = vault.valueStoreState.getBackup();
            }

            if (vault.filterStoreState.updatedProperties.length > 0)
            {
                vaultBackup["filterStoreState"] = vault.filterStoreState.getBackup();
            }

            if (vault.groupStoreState.updatedProperties.length > 0)
            {
                vaultBackup["groupStoreState"] = vault.groupStoreState.getBackup();
            }

            partialVaultsToBackup.push(vaultBackup);
        }

        return [true, partialVaultsToBackup];

        function getVaults(repository: Repository<Vault>): Promise<Vault[]>
        {
            return repository
                .createQueryBuilder('vaults')
                .leftJoinAndSelect("vaults.userVault", "userVault")
                .leftJoinAndSelect("vaults.vaultStoreState", "vaultStoreState")
                .leftJoinAndSelect("vaults.passwordStoreState", "passwordStoreState")
                .leftJoinAndSelect("vaults.valueStoreState", "valueStoreState")
                .leftJoinAndSelect("vaults.filterStoreState", "filterStoreState")
                .leftJoinAndSelect("vaults.groupStoreState", "groupStoreState")
                .where("userVault.userID = :userID", { userID: currentUser?.userID })
                .andWhere(`
                    userVault.entityState != :entityState OR 
                    vaultStoreState.entityState != :entityState OR 
                    passwordStoreState.entityState != :entityState OR 
                    valueStoreState.entityState != :entityState OR 
                    filterStoreState.entityState != :entityState OR 
                    groupStoreState.entityState != :entityState`,
                    { entityState: EntityState.Unchanged })
                .getMany();
        }
    }

    public async resetBackupTrackingForEntities(entities: Partial<Vault>[]): Promise<boolean> 
    {
        const currentUser = environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            return false;
        }

        this.repository
            .createQueryBuilder("vaults")
            .innerJoin("vaults.vaultStoreState", "vaultStoreState")
            .innerJoin("vaults.passwordStoreState", "passwordStoreState")
            .innerJoin("vaults.valueStoreState", "valueStoreState")
            .innerJoin("vaults.filterStoreState", "filterStoreState")
            .innerJoin("vaults.groupStoreState", "groupStoreState")
            .update()
            .set(
                {
                    entityState: EntityState.Unchanged,
                    serializedPropertiesToSync: "[]",
                    vaultStoreState: {
                        entityState: EntityState.Unchanged,
                        serializedPropertiesToSync: "[]"
                    },
                    passwordStoreState: {
                        entityState: EntityState.Unchanged,
                        serializedPropertiesToSync: "[]"
                    },
                    valueStoreState: {
                        entityState: EntityState.Unchanged,
                        serializedPropertiesToSync: "[]"
                    },
                    filterStoreState: {
                        entityState: EntityState.Unchanged,
                        serializedPropertiesToSync: "[]"
                    },
                    groupStoreState: {
                        entityState: EntityState.Unchanged,
                        serializedPropertiesToSync: "[]"
                    },
                }
            )
            .where("userID = :userID", { userID: currentUser.userID })
            .andWhere("vaultID IN (:...vaultIDs)", { vaultIDs: entities.map(e => e.vaultID) })
            .execute();

        return true;
    }

    public async addFromServer(vault: Partial<Vault>)
    {
        if (!vault.vaultID ||
            !vault.userVaults ||
            !vault.signatureSecret ||
            !vault.currentSignature ||
            !vault.name ||
            !vault.color ||
            !vault.vaultStoreState ||
            !vault.passwordStoreState ||
            !vault.valueStoreState ||
            !vault.filterStoreState ||
            !vault.groupStoreState)
        {
            return;
        }

        // TODO: make sure this saves vaultPreferencesStoreState correctly
        this.repository.insert(vault);
    }

    public async updateFromServer(currentVault: Partial<Vault>, newVault: Partial<Vault>)
    {
        const setProperties = {}
        if (!newVault.vaultID)
        {
            return;
        }

        if (newVault.signatureSecret)
        {
            setProperties[nameof<Vault>("signatureSecret")] = newVault.signatureSecret;
        }

        if (newVault.currentSignature)
        {
            setProperties[nameof<Vault>("currentSignature")] = newVault.currentSignature;
        }

        if (newVault.name)
        {
            setProperties[nameof<Vault>("name")] = newVault.name;
        }

        if (newVault.color)
        {
            setProperties[nameof<Vault>("color")] = newVault.color;
        }

        if (newVault.vaultStoreState)
        {
            if (!currentVault.vaultStoreState?.entityState)
            {
                currentVault = (await this.repository.findOneBy({
                    vaultID: newVault.vaultID
                })) as Vault;
            }

            if (currentVault.vaultStoreState?.entityState == EntityState.Updated)
            {
                // TODO: merge changes between states
            }
            else
            {
                setProperties[nameof<Vault>("vaultStoreState")] =
                    StoreState.getUpdatedPropertiesFromObject(newVault.vaultStoreState);
            }
        }

        if (newVault.passwordStoreState)
        {
            if (!currentVault.passwordStoreState?.entityState)
            {
                currentVault = (await this.repository.findOneBy({
                    vaultID: newVault.vaultID
                })) as Vault;
            }

            if (currentVault.passwordStoreState?.entityState == EntityState.Updated)
            {
                // TODO: merge changes between states
            }
            else 
            {
                setProperties[nameof<Vault>("passwordStoreState")] =
                    StoreState.getUpdatedPropertiesFromObject(newVault.passwordStoreState);
            }
        }

        if (newVault.valueStoreState)
        {
            if (!currentVault.valueStoreState?.entityState)
            {
                currentVault = (await this.repository.findOneBy({
                    vaultID: newVault.vaultID
                })) as Vault;
            }

            if (currentVault.valueStoreState?.entityState == EntityState.Updated)
            {
                // TODO: merge changes between states
            }
            else 
            {
                setProperties[nameof<Vault>("valueStoreState")] =
                    StoreState.getUpdatedPropertiesFromObject(newVault.valueStoreState);
            }
        }

        if (newVault.filterStoreState)
        {
            if (!currentVault.filterStoreState?.entityState)
            {
                currentVault = (await this.repository.findOneBy({
                    vaultID: newVault.vaultID
                })) as Vault;
            }

            if (currentVault.filterStoreState?.entityState == EntityState.Updated)
            {
                // TODO: merge changes between states
            }
            else 
            {
                setProperties[nameof<Vault>("filterStoreState")] =
                    StoreState.getUpdatedPropertiesFromObject(newVault.filterStoreState);
            }
        }

        if (newVault.groupStoreState)
        {
            if (!currentVault.groupStoreState?.entityState)
            {
                currentVault = (await this.repository.findOneBy({
                    vaultID: newVault.vaultID
                })) as Vault;
            }

            if (currentVault.groupStoreState?.entityState == EntityState.Updated)
            {
                // TODO: merge changes between states
            }
            else 
            {
                setProperties[nameof<Vault>("groupStoreState")] =
                    StoreState.getUpdatedPropertiesFromObject(newVault.groupStoreState);
            }
        }

        return this.repository
            .createQueryBuilder()
            .update()
            .set(setProperties)
            .where("vaultID = :vaultID", { vaultID: newVault.vaultID })
            .execute();
    }

    public async deleteFromServer(vault: Partial<Vault>)
    {
        if (!vault.vaultID || vault.userVaults?.length == 0)
        {
            return;
        }

        const deleteVaultPromise = this.repository.createQueryBuilder()
            .delete()
            .where("vaultID = :vaultID", { vaultID: vault.vaultID })
            .execute();

        const deleteUserVaultsPromise = environment.repositories.userVaults.deleteFromServerAndVault(vault.vaultID);
        return Promise.all([deleteVaultPromise, deleteUserVaultsPromise]);
    }
}

const vaultRepository: VaultRepository = new VaultRepository();
export default vaultRepository;
export type VaultRepositoryType = typeof vaultRepository;