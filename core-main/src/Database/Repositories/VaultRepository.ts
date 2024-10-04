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
import { DeepPartial, nameof } from "../../Helpers/TypeScriptHelper";
import { StoreState } from "../Entities/States/StoreState";
import { User } from "../Entities/User";

class VaultRepository extends VaulticRepository<Vault>
{
    protected getRepository(): Repository<Vault> | undefined
    {
        return environment.databaseDataSouce.getRepository(Vault);
    }

    public async setLastUsedVault(user: User, userVaultID: number)
    {
        const transaction = new Transaction();

        const currentVaults: Vault[] = await this.repository.createQueryBuilder("vaults")
            .leftJoinAndSelect("vaults.userVaults", "userVaults")
            .where("userVaults.userID = :userID", { userID: user.userID })
            .andWhere("vaults.lastUsed = :lastUsed", { lastUsed: true })
            .getMany();

        for (let i = 0; i < currentVaults.length; i++)
        {
            const reactiveCurrentUserVault = currentVaults[i].makeReactive();
            reactiveCurrentUserVault.lastUsed = false;
            transaction.updateEntity(currentVaults[i], "", () => this);
        }

        const newCurrentVault: Vault | null = await this.repository.createQueryBuilder("vaults")
            .leftJoinAndSelect("vaults.userVaults", "userVaults")
            .where("userVaults.userID = :userID", { userID: user.userID })
            .andWhere("userVaults.userVaultID = :userVaultID", { userVaultID })
            .getOne();

        if (!newCurrentVault)
        {
            return false;
        }

        const rectiveNewCurrentVault = newCurrentVault.makeReactive();
        rectiveNewCurrentVault.lastUsed = true;
        transaction.updateEntity(rectiveNewCurrentVault, "", () => this);

        return await transaction.commit();
    }

    protected getLastUsedVault(user: User): Promise<Vault | null>
    {
        return this.repository.createQueryBuilder("vaults")
            .leftJoin("vaults.userVaults", "userVaults")
            .where("userVaults.userID = :userID", { userID: user.userID })
            .andWhere("vaults.lastUsed = :lastUsed", { lastUsed: true })
            .getOne();
    }

    public async createNewVault(name: string): Promise<boolean | [UserVault, Vault, string]>
    {
        // TODO: what happens if we fail to re back these up after creating them? There will then be pointless records on the server
        // Create an initalized property on the userVault on server and default to false. Once it has been backed up once, set to true.
        // Have scheduled task to remove all userVaults with initalized is false for more than a day
        const response = await vaulticServer.vault.create();
        if (!response.Success)
        {
            return false;
        }

        const vaultKey = environment.utilities.generator.randomValue(60);

        const userVault = new UserVault().makeReactive();
        userVault.vaultPreferencesStoreState = new VaultPreferencesStoreState().makeReactive();

        const vault = new Vault().makeReactive();
        vault.lastUsed = true;
        vault.name = name;
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

        return [userVault, vault, vaultKey];
    }

    public async createNewVaultForUser(masterKey: string, name: string, setAsActive: boolean, doBackupData: boolean): Promise<boolean | CondensedVaultData>
    {
        const currentUser = await environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            return false;
        }

        const vaultData = await this.createNewVault(name);
        if (!vaultData)
        {
            return false;
        }

        const userVault: UserVault = vaultData[0];
        const vault: Vault = vaultData[1];
        const vaultKey: string = vaultData[2];

        const encryptedVaultKey = await environment.utilities.crypt.ECEncrypt(currentUser.publicKey, vaultKey);
        if (!encryptedVaultKey.success)
        {
            return false;
        }

        userVault.userID = currentUser.userID;
        userVault.user = currentUser;
        userVault.vaultKey = JSON.stringify({
            vaultKey: encryptedVaultKey.value!,
            publicKey: encryptedVaultKey.publicKey
        });

        const transaction = new Transaction();

        if (setAsActive)
        {
            vault.lastUsed = true;
            const lastUsedVault = await this.getLastUsedVault(currentUser);
            if (lastUsedVault)
            {
                const reactiveLastUsedVault = lastUsedVault.makeReactive();
                reactiveLastUsedVault.lastUsed = false;

                transaction.updateEntity(reactiveLastUsedVault, "", () => this);
            }
        }

        // Order matters here
        transaction.insertEntity(vault, vaultKey, () => environment.repositories.vaults);
        transaction.insertEntity(vault.vaultStoreState, vaultKey, () => environment.repositories.vaultStoreStates);
        transaction.insertEntity(vault.passwordStoreState, vaultKey, () => environment.repositories.passwordStoreStates);
        transaction.insertEntity(vault.valueStoreState, vaultKey, () => environment.repositories.valueStoreStates);
        transaction.insertEntity(vault.filterStoreState, vaultKey, () => environment.repositories.filterStoreStates);
        transaction.insertEntity(vault.groupStoreState, vaultKey, () => environment.repositories.groupStoreStates);

        transaction.insertEntity(userVault, masterKey, () => environment.repositories.userVaults);
        transaction.insertEntity(userVault.vaultPreferencesStoreState, masterKey, () => environment.repositories.vaultPreferencesStoreStates);

        if (!(await transaction.commit()))
        {
            return false;
        }

        if (doBackupData)
        {
            const backupResponse = await backupData(masterKey);
            if (!backupResponse)
            {
                return false;
            }
        }

        const uvData = await environment.repositories.userVaults.getVerifiedAndDecryt(masterKey, undefined, userVault.userVaultID);
        if (!uvData || uvData.length == 0)
        {
            return false;
        }

        return uvData[0];
    }

    public async setActiveVault(masterKey: string, userVaultID: number): Promise<boolean | CondensedVaultData>
    {
        const currentUser = await environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            return false;
        }

        const userVaults = await environment.repositories.userVaults.getVerifiedAndDecryt(masterKey, undefined, userVaultID);
        if (userVaults && userVaults.length == 1)
        {
            if (!(await this.setLastUsedVault(currentUser, userVaultID)))
            {
                return false;
            }

            return userVaults[0]
        }

        return false;
    }

    public async saveVault(masterKey: string, userVaultID: number, data: string, backup: boolean)
    {
        const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, userVaultID);
        if (userVaults[0].length == 0)
        {
            return false;
        }

        const oldVault = userVaults[0][0].vault.makeReactive();
        const vaultKey = userVaults[1][0];

        const newVault: CondensedVaultData = JSON.parse(data);
        const transaction = new Transaction();

        if (newVault.name)
        {
            oldVault.name = newVault.name;
            transaction.updateEntity(oldVault, vaultKey, () => this);
        }

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

        return true;
    }

    public async archiveVault(masterKey: string, userVaultID: number, backup: boolean): Promise<boolean>
    {
        const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, userVaultID);
        if (userVaults[0].length == 0)
        {
            return false;
        }

        const vault = userVaults[0][0].vault.makeReactive();
        vault.entityState = EntityState.Deleted;

        const transaction = new Transaction();
        transaction.updateEntity(vault, userVaults[1][0], () => this);

        if (!(await transaction.commit()))
        {
            return false;
        }

        if (backup)
        {
            return await backupData(masterKey);
        }

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

    public async postBackupEntitiesUpdates(entities: Partial<Vault>[]): Promise<boolean> 
    {
        const currentUser = await environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            return false;
        }

        let succeeded = true;

        const deletedVaults: Partial<Vault>[] = [];
        const otherVaults: Partial<Vault>[] = [];

        for (let i = 0; i < entities.length; i++)
        {
            if (entities[i].entityState == EntityState.Deleted)
            {
                deletedVaults.push(entities[i])
            }
            else 
            {
                otherVaults.push(entities[i]);
            }
        }

        if (deletedVaults.length > 0)
        {
            for (let i = 0; i < deletedVaults.length; i++)
            {
                const transaction = new Transaction();
                transaction.deleteEntity(deletedVaults[i].vaultID!, () => this);

                await transaction.commit();
            }
        }

        if (otherVaults.length > 0)
        {
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
                    .andWhere("vaultID IN (:...vaultIDs)", { vaultIDs: otherVaults.map(e => e.vaultID) })
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

            for (let i = 0; i < otherVaults.length; i++)
            {
                if (otherVaults[i].vaultStoreState && otherVaults[i].vaultStoreState!.vaultStoreStateID)
                {
                    vaultStoreStatesToUpdate.push(otherVaults[i].vaultStoreState!);
                }

                if (otherVaults[i].passwordStoreState && otherVaults[i].passwordStoreState!.passwordStoreStateID)
                {
                    passwordStoreStatesToUpdate.push(otherVaults[i].passwordStoreState!);
                }

                if (otherVaults[i].valueStoreState && otherVaults[i].valueStoreState!.valueStoreStateID)
                {
                    valueStoreStatesToUpdate.push(otherVaults[i].valueStoreState!);
                }

                if (otherVaults[i].filterStoreState && otherVaults[i].filterStoreState!.filterStoreStateID)
                {
                    filterStoreStatesToUpdate.push(otherVaults[i].filterStoreState!);
                }

                if (otherVaults[i].groupStoreState && otherVaults[i].groupStoreState!.groupStoreStateID)
                {
                    groupStoreStatesToUpdate.push(otherVaults[i].groupStoreState!);
                }
            }

            if (vaultStoreStatesToUpdate.length > 0)
            {
                succeeded = succeeded && await environment.repositories.vaultStoreStates.postBackupEntitiesUpdates(vaultStoreStatesToUpdate);
            }

            if (passwordStoreStatesToUpdate.length > 0)
            {
                succeeded = succeeded && await environment.repositories.passwordStoreStates.postBackupEntitiesUpdates(passwordStoreStatesToUpdate);
            }

            if (valueStoreStatesToUpdate.length > 0)
            {
                succeeded = succeeded && await environment.repositories.valueStoreStates.postBackupEntitiesUpdates(valueStoreStatesToUpdate);
            }

            if (filterStoreStatesToUpdate.length > 0)
            {
                succeeded = succeeded && await environment.repositories.filterStoreStates.postBackupEntitiesUpdates(filterStoreStatesToUpdate);
            }

            if (groupStoreStatesToUpdate.length > 0)
            {
                succeeded = succeeded && await environment.repositories.groupStoreStates.postBackupEntitiesUpdates(groupStoreStatesToUpdate);
            }
        }

        return succeeded;
    }

    public addFromServer(vault: DeepPartial<Vault>, transaction: Transaction): boolean
    {
        if (!Vault.isValid(vault))
        {
            return false;
        }

        vault.lastUsed = false;

        transaction.insertExistingEntity(vault, () => environment.repositories.vaults);
        transaction.insertExistingEntity(vault.vaultStoreState!, () => environment.repositories.vaultStoreStates);
        transaction.insertExistingEntity(vault.passwordStoreState!, () => environment.repositories.passwordStoreStates);
        transaction.insertExistingEntity(vault.valueStoreState!, () => environment.repositories.valueStoreStates);
        transaction.insertExistingEntity(vault.filterStoreState!, () => environment.repositories.filterStoreStates);
        transaction.insertExistingEntity(vault.groupStoreState!, () => environment.repositories.groupStoreStates);

        return true;
    }

    public async updateFromServer(currentVault: DeepPartial<Vault>, newVault: DeepPartial<Vault>)
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