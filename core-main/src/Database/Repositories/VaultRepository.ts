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

        console.log(response);

        const userVault = new UserVault().makeReactive();
        userVault.vaultPreferencesStoreState = new VaultPreferencesStoreState().makeReactive();

        const vault = new Vault().makeReactive();
        vault.lastUsed = true;
        vault.name = name;
        vault.color = color;
        vault.vaultStoreState = new VaultStoreState().makeReactive();
        vault.passwordStoreState = new PasswordStoreState().makeReactive();
        vault.valueStoreState = new ValueStoreState().makeReactive();
        vault.filterStoreState = new FilterStoreState().makeReactive();
        vault.groupStoreState = new GroupStoreState().makeReactive();

        userVault.vault = vault;
        vault.userVaults = [userVault];

        userVault.userVaultID = response.UserVaultID!;
        userVault.vaultID = response.VaultID!;
        userVault.vaultPreferencesStoreState.userVaultID = response.UserVaultID!;
        userVault.vaultPreferencesStoreState.vaultPreferencesStoreStateID = response.VaultPreferencesStoreStateID!;
        userVault.vaultPreferencesStoreState.state = "{}";

        vault.vaultID = response.VaultID!;
        vault.vaultStoreState.vaultID = response.VaultID!;
        vault.vaultStoreState.vaultStoreStateID = response.VaultStoreStateID!;
        vault.vaultStoreState.state = "{}";
        vault.passwordStoreState.vaultID = response.VaultID!;
        vault.passwordStoreState.passwordStoreStateID = response.PasswordStoreStateID!;
        vault.passwordStoreState.state = "{}";
        vault.valueStoreState.vaultID = response.VaultID!;
        vault.valueStoreState.valueStoreStateID = response.ValueStoreStateID!;
        vault.valueStoreState.state = "{}";
        vault.filterStoreState.vaultID = response.VaultID!;
        vault.filterStoreState.filterStoreStateID = response.FilterStoreStateID!;
        vault.filterStoreState.state = "{}";
        vault.groupStoreState.vaultID = response.VaultID!;
        vault.groupStoreState.groupStoreStateID = response.GroupStoreStateID!;
        vault.groupStoreState.state = "{}";

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
        console.log(data);
        const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, userVaultID);
        if (userVaults[0].length == 0)
        {
            return false;
        }

        const oldVault = userVaults[0][0].vault;
        const vaultKey = userVaults[1][0];

        const newVault: CondensedVaultData = JSON.parse(data);
        const transaction = new Transaction();

        if (newVault.vaultStoreState)
        {
            if (!await (environment.repositories.vaultStoreStates.updateState(
                oldVault.vaultStoreState.vaultStoreStateID, vaultKey, newVault.vaultStoreState, transaction)))
            {
                console.log('vault update failed');
                return false;
            }
        }

        if (newVault.passwordStoreState)
        {
            if (!await (environment.repositories.passwordStoreStates.updateState(
                oldVault.passwordStoreState.passwordStoreStateID, vaultKey, newVault.passwordStoreState, transaction)))
            {
                console.log('password update failed');
                return false;
            }
        }

        if (newVault.valueStoreState)
        {
            if (!await (environment.repositories.valueStoreStates.updateState(
                oldVault.valueStoreState.valueStoreStateID, vaultKey, newVault.valueStoreState, transaction)))
            {
                console.log('value update failed');
                return false;
            }
        }

        if (newVault.filterStoreState)
        {
            if (!await (environment.repositories.filterStoreStates.updateState(
                oldVault.filterStoreState.filterStoreStateID, vaultKey, newVault.filterStoreState, transaction)))
            {
                console.log('filter update failed');
                return false;
            }
        }

        if (newVault.groupStoreState)
        {
            if (!await (environment.repositories.groupStoreStates.updateState(
                oldVault.groupStoreState.groupStoreStateID, vaultKey, newVault.groupStoreState, transaction)))
            {
                console.log('group update failed');
                return false;
            }
        }

        const saved = await transaction.commit();
        if (!saved)
        {
            console.log('save failed');
            return false;
        }

        if (backup)
        {
            await backupData(masterKey);
        }

        console.log('succeeded');
        return true;
    }

    public async getEntitiesThatNeedToBeBackedUp(masterKey: string): Promise<[boolean, Partial<Vault>[] | null]> 
    {
        const currentUser = await environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            return [false, null];
        }

        let userVaultsWithVaultsToBackup = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey,
            undefined, currentUser, vaultQuery);

        // TODO: need to return false here if the vaults where unvarified but true if there just isn't any
        if (userVaultsWithVaultsToBackup[0].length == 0)
        {
            return [false, null];
        }

        const partialVaultsToBackup: Partial<Vault>[] = [];

        for (let i = 0; i < userVaultsWithVaultsToBackup[0].length; i++)
        {
            const vaultBackup = {};
            const vault = userVaultsWithVaultsToBackup[0][i].vault;

            if (vault.propertiesToSync.length > 0)
            {
                Object.assign(vaultBackup, vault.getBackup());
            }
            else 
            {
                vaultBackup["vaultID"] = vault.vaultID;
            }

            if (vault.vaultStoreState.propertiesToSync.length > 0)
            {
                vaultBackup["vaultStoreState"] = vault.vaultStoreState.getBackup();
            }

            if (vault.passwordStoreState.propertiesToSync.length > 0)
            {
                vaultBackup["passwordStoreState"] = vault.passwordStoreState.getBackup();
            }

            if (vault.valueStoreState.propertiesToSync.length > 0)
            {
                vaultBackup["valueStoreState"] = vault.valueStoreState.getBackup();
            }

            if (vault.filterStoreState.propertiesToSync.length > 0)
            {
                vaultBackup["filterStoreState"] = vault.filterStoreState.getBackup();
            }

            if (vault.groupStoreState.propertiesToSync.length > 0)
            {
                vaultBackup["groupStoreState"] = vault.groupStoreState.getBackup();
            }

            partialVaultsToBackup.push(vaultBackup);
        }

        return [true, partialVaultsToBackup];

        function vaultQuery(repository: Repository<UserVault>): Promise<UserVault[]>
        {
            return repository
                .createQueryBuilder('userVaults')
                .leftJoinAndSelect("userVaults.vault", "vault")
                .leftJoinAndSelect("vault.vaultStoreState", "vaultStoreState")
                .leftJoinAndSelect("vault.passwordStoreState", "passwordStoreState")
                .leftJoinAndSelect("vault.valueStoreState", "valueStoreState")
                .leftJoinAndSelect("vault.filterStoreState", "filterStoreState")
                .leftJoinAndSelect("vault.groupStoreState", "groupStoreState")
                .where("userVaults.userID = :userID", { userID: currentUser?.userID })
                .andWhere(`(
                    vault.entityState != :entityState OR 
                    vaultStoreState.entityState != :entityState OR 
                    passwordStoreState.entityState != :entityState OR 
                    valueStoreState.entityState != :entityState OR 
                    filterStoreState.entityState != :entityState OR 
                    groupStoreState.entityState != :entityState
                )`,
                    { entityState: EntityState.Unchanged })
                .getMany();
        }
    }

    public async resetBackupTrackingForEntities(entities: Partial<Vault>[]): Promise<boolean> 
    {
        const currentUser = await environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            return false;
        }

        let succeeded = true;

        try 
        {
            this.repository
                .createQueryBuilder("vaults")
                .update()
                .set(
                    {
                        entityState: EntityState.Unchanged,
                        serializedPropertiesToSync: "[]",
                    }
                )
                .andWhere("vaultID IN (:...vaultIDs)", { vaultIDs: entities.map(e => e.vaultID) })
                .execute();
        }
        catch 
        {
            // TODO: log
            succeeded = false;
        }

        const vaultStoreStatesToUpdate: Partial<VaultStoreState>[] = [];
        const passwordStoreStatesToUpdate: Partial<PasswordStoreState>[] = [];
        const valueStoreStatesToUpdate: Partial<ValueStoreState>[] = [];
        const filterStoreStatesToUpdate: Partial<FilterStoreState>[] = [];
        const groupStoreStatesToUpdate: Partial<GroupStoreState>[] = [];

        for (let i = 0; i < entities.length; i++)
        {
            if (entities[i].vaultStoreState && entities[i].vaultStoreState!.vaultStoreStateID)
            {
                vaultStoreStatesToUpdate.push(entities[i].vaultStoreState!);
            }

            if (entities[i].passwordStoreState && entities[i].passwordStoreState!.passwordStoreStateID)
            {
                passwordStoreStatesToUpdate.push(entities[i].passwordStoreState!);
            }

            if (entities[i].valueStoreState && entities[i].valueStoreState!.valueStoreStateID)
            {
                valueStoreStatesToUpdate.push(entities[i].valueStoreState!);
            }

            if (entities[i].filterStoreState && entities[i].filterStoreState!.filterStoreStateID)
            {
                filterStoreStatesToUpdate.push(entities[i].filterStoreState!);
            }

            if (entities[i].groupStoreState && entities[i].groupStoreState!.groupStoreStateID)
            {
                groupStoreStatesToUpdate.push(entities[i].groupStoreState!);
            }
        }

        if (vaultStoreStatesToUpdate.length > 0)
        {
            succeeded = await environment.repositories.vaultStoreStates.resetBackupTrackingForEntities(vaultStoreStatesToUpdate);
        }

        if (passwordStoreStatesToUpdate.length > 0)
        {
            succeeded = await environment.repositories.passwordStoreStates.resetBackupTrackingForEntities(passwordStoreStatesToUpdate);
        }

        if (valueStoreStatesToUpdate.length > 0)
        {
            succeeded = await environment.repositories.valueStoreStates.resetBackupTrackingForEntities(valueStoreStatesToUpdate);
        }

        if (filterStoreStatesToUpdate.length > 0)
        {
            succeeded = await environment.repositories.filterStoreStates.resetBackupTrackingForEntities(filterStoreStatesToUpdate);
        }

        if (groupStoreStatesToUpdate.length > 0)
        {
            succeeded = await environment.repositories.groupStoreStates.resetBackupTrackingForEntities(groupStoreStatesToUpdate);
        }

        return succeeded;
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