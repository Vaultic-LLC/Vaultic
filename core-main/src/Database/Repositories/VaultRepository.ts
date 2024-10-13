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
import { backupData } from "../../Helpers/RepositoryHelper";
import { DeepPartial, nameof } from "../../Helpers/TypeScriptHelper";
import { StoreState } from "../Entities/States/StoreState";
import { User } from "../Entities/User";
import { TypedMethodResponse } from "../../Types/MethodResponse";
import { safetifyMethod } from "../../Helpers/RepositoryHelper";
import errorCodes from "../../Types/ErrorCodes";

class VaultRepository extends VaulticRepository<Vault>
{
    protected getRepository(): Repository<Vault> | undefined
    {
        return environment.databaseDataSouce.getRepository(Vault);
    }

    public async getAllVaultIDs(): Promise<number[]>
    {
        const vaults = await this.repository.find();
        return vaults.map(v => v.vaultID);
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

    public async createNewVault(name: string): Promise<boolean | [UserVault, Vault, string]>
    {
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

    public async createNewVaultForUser(masterKey: string, name: string, setAsActive: boolean, doBackupData: boolean): Promise<TypedMethodResponse<CondensedVaultData | undefined>>
    {
        return await safetifyMethod(this, internalCreateNewVaultForUser);

        async function internalCreateNewVaultForUser(this: VaultRepository): Promise<TypedMethodResponse<CondensedVaultData>>
        {
            console.log('creating vault');
            const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
            if (!currentUser)
            {
                return TypedMethodResponse.fail(errorCodes.NO_USER);
            }

            const vaultData = await this.createNewVault(name);
            if (!vaultData)
            {
                return TypedMethodResponse.fail(undefined, undefined, "No Vault Data");
            }

            const userVault: UserVault = vaultData[0];
            const vault: Vault = vaultData[1];
            const vaultKey: string = vaultData[2];

            const encryptedVaultKey = await environment.utilities.crypt.ECEncrypt(currentUser.publicKey, vaultKey);
            if (!encryptedVaultKey.success)
            {
                return TypedMethodResponse.fail(errorCodes.EC_ENCRYPTION_FAILED);
            }

            userVault.userID = currentUser.userID;
            userVault.user = currentUser;
            userVault.vaultKey = JSON.stringify({
                vaultKey: encryptedVaultKey.value!,
                publicKey: encryptedVaultKey.publicKey
            });

            const transaction = new Transaction();

            // Order matters here
            transaction.insertEntity(vault, vaultKey, () => environment.repositories.vaults);
            transaction.insertEntity(vault.vaultStoreState, vaultKey, () => environment.repositories.vaultStoreStates);
            transaction.insertEntity(vault.passwordStoreState, vaultKey, () => environment.repositories.passwordStoreStates);
            transaction.insertEntity(vault.valueStoreState, vaultKey, () => environment.repositories.valueStoreStates);
            transaction.insertEntity(vault.filterStoreState, vaultKey, () => environment.repositories.filterStoreStates);
            transaction.insertEntity(vault.groupStoreState, vaultKey, () => environment.repositories.groupStoreStates);

            transaction.insertEntity(userVault, masterKey, () => environment.repositories.userVaults);
            transaction.insertEntity(userVault.vaultPreferencesStoreState, "", () => environment.repositories.vaultPreferencesStoreStates);

            if (!(await transaction.commit()))
            {
                await vaulticServer.vault.failedToSaveVault(userVault.userVaultID);
                return TypedMethodResponse.transactionFail();
            }

            if (doBackupData)
            {
                const backupResponse = await backupData(masterKey);
                if (!backupResponse)
                {
                    console.log('backup failed')
                    return TypedMethodResponse.backupFail();
                }

                console.log('backup succeeded');
            }

            if (setAsActive)
            {
                await this.setLastUsedVault(currentUser, userVault.userVaultID);
            }

            const uvData = await environment.repositories.userVaults.getVerifiedAndDecryt(masterKey, undefined, [userVault.userVaultID]);
            if (!uvData || uvData.length == 0)
            {
                return TypedMethodResponse.fail(undefined, undefined, "No UserVaults");
            }

            return TypedMethodResponse.success(uvData[0]);
        }
    }

    public async setActiveVault(masterKey: string, userVaultID: number): Promise<TypedMethodResponse<CondensedVaultData | undefined>>
    {
        return await safetifyMethod(this, internalSetActiveVault);

        async function internalSetActiveVault(this: VaultRepository): Promise<TypedMethodResponse<CondensedVaultData>>
        {
            const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
            if (!currentUser)
            {
                return TypedMethodResponse.fail(errorCodes.NO_USER);
            }

            const userVaults = await environment.repositories.userVaults.getVerifiedAndDecryt(masterKey, undefined, [userVaultID]);
            if (userVaults && userVaults.length == 1)
            {
                if (!(await this.setLastUsedVault(currentUser, userVaultID)))
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed To Set Last User");
                }

                return TypedMethodResponse.success(userVaults[0]);
            }

            return TypedMethodResponse.fail(undefined, undefined, "No User Vault");
        }
    }

    public async saveVault(masterKey: string, userVaultID: number, data: string, backup: boolean): Promise<TypedMethodResponse<boolean | undefined>>
    {
        return await safetifyMethod(this, internalSaveVault);

        async function internalSaveVault(this: VaultRepository): Promise<TypedMethodResponse<boolean>>
        {
            const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, [userVaultID]);
            if (userVaults[0].length == 0)
            {
                return TypedMethodResponse.fail(undefined, undefined, "No UserVault");
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
                    return TypedMethodResponse.fail(undefined, undefined, "Failed To Update VaultStoreState");
                }
            }

            if (newVault.passwordStoreState)
            {
                if (!await (environment.repositories.passwordStoreStates.updateState(
                    oldVault.passwordStoreState.passwordStoreStateID, vaultKey, newVault.passwordStoreState, transaction)))
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed To Update PasswordStoreState");
                }
            }

            if (newVault.valueStoreState)
            {
                if (!await (environment.repositories.valueStoreStates.updateState(
                    oldVault.valueStoreState.valueStoreStateID, vaultKey, newVault.valueStoreState, transaction)))
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed To Update ValueStoreState");
                }
            }

            if (newVault.filterStoreState)
            {
                if (!await (environment.repositories.filterStoreStates.updateState(
                    oldVault.filterStoreState.filterStoreStateID, vaultKey, newVault.filterStoreState, transaction)))
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed To Update FilterStoreState");
                }
            }

            if (newVault.groupStoreState)
            {
                if (!await (environment.repositories.groupStoreStates.updateState(
                    oldVault.groupStoreState.groupStoreStateID, vaultKey, newVault.groupStoreState, transaction)))
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed To Update GroupStoreState");
                }
            }

            const saved = await transaction.commit();
            if (!saved)
            {
                return TypedMethodResponse.transactionFail();
            }

            if (backup && !(await backupData(masterKey)))
            {
                return TypedMethodResponse.backupFail();
            }

            return TypedMethodResponse.success();
        }
    }

    public async archiveVault(masterKey: string, userVaultID: number, backup: boolean): Promise<TypedMethodResponse<boolean | undefined>>
    {
        return await safetifyMethod(this, internalArchiveVault);

        async function internalArchiveVault(this: VaultRepository): Promise<TypedMethodResponse<boolean>>
        {
            const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, [userVaultID]);
            if (userVaults[0].length == 0)
            {
                return TypedMethodResponse.fail(undefined, undefined, "No UserVaults");
            }

            const vault = userVaults[0][0].vault.makeReactive();
            vault.entityState = EntityState.Deleted;

            const transaction = new Transaction();
            transaction.updateEntity(vault, userVaults[1][0], () => this);

            if (!(await transaction.commit()))
            {
                return TypedMethodResponse.transactionFail();
            }

            if (backup && !(await backupData(masterKey)))
            {
                return TypedMethodResponse.backupFail();
            }

            return TypedMethodResponse.success(true);
        }
    }

    public async getEntitiesThatNeedToBeBackedUp(masterKey: string): Promise<[boolean, Partial<Vault>[] | null]> 
    {
        const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
        if (!currentUser)
        {
            return [false, null];
        }

        let userVaultsWithVaultsToBackup = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey,
            undefined, currentUser, vaultQuery);

        if (userVaultsWithVaultsToBackup[0].length == 0)
        {
            return [true, null];
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
                .leftJoinAndSelect('userVaults.vaultPreferencesStoreState', 'vaultPreferencesStoreState')
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

    public async postBackupEntitiesUpdates(key: string, entities: Partial<Vault>[], transaction: Transaction): Promise<boolean> 
    {
        const currentUser = await environment.repositories.users.getVerifiedCurrentUser(key);
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
                transaction.deleteEntity(deletedVaults[i].vaultID!, () => this);
            }
        }

        if (otherVaults.length > 0)
        {
            const vaultIDs = otherVaults.filter(v => v.vaultID).map(v => v.vaultID!);
            const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(key, vaultIDs, currentUser, userVaultQuery);

            for (let i = 0; i < otherVaults.length; i++)
            {
                const index = userVaults[0].findIndex(v => v.vault.vaultID == otherVaults[i].vaultID);
                if (index < 0)
                {
                    continue;
                }

                const vault = userVaults[0][index].vault;
                const vaultKey = userVaults[1][index];

                transaction.resetTracking(vault, vaultKey, () => this);

                if (otherVaults[i].vaultStoreState)
                {
                    transaction.resetTracking(vault.vaultStoreState, vaultKey, () => environment.repositories.vaultStoreStates);
                }

                if (otherVaults[i].passwordStoreState)
                {
                    transaction.resetTracking(vault.passwordStoreState, vaultKey, () => environment.repositories.passwordStoreStates);
                }

                if (otherVaults[i].valueStoreState)
                {
                    transaction.resetTracking(vault.valueStoreState, vaultKey, () => environment.repositories.valueStoreStates);
                }

                if (otherVaults[i].filterStoreState)
                {
                    transaction.resetTracking(vault.filterStoreState, vaultKey, () => environment.repositories.filterStoreStates);
                }

                if (otherVaults[i].groupStoreState)
                {
                    transaction.resetTracking(vault.groupStoreState, vaultKey, () => environment.repositories.groupStoreStates);
                }
            }

            function userVaultQuery(repository: Repository<UserVault>)
            {
                return repository
                    .createQueryBuilder('userVault')
                    .leftJoinAndSelect('userVault.vaultPreferencesStoreState', 'vaultPreferencesStoreState')
                    .leftJoinAndSelect('userVault.vault', 'vault')
                    .leftJoinAndSelect('vault.vaultStoreState', 'vaultStoreState')
                    .leftJoinAndSelect('vault.passwordStoreState', 'passwordStoreState')
                    .leftJoinAndSelect('vault.valueStoreState', 'valueStoreState')
                    .leftJoinAndSelect('vault.filterStoreState', 'filterStoreState')
                    .leftJoinAndSelect('vault.groupStoreState', 'groupStoreState')
                    .where('userVault.userID = :userID', { userID: currentUser!.userID })
                    .andWhere('userVault.vaultID IN (:...vaultIDs)', { vaultIDs })
                    .getMany();
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

    public async updateFromServer(currentVault: DeepPartial<Vault>, newVault: DeepPartial<Vault>, transaction: Transaction)
    {
        if (!newVault.vaultID)
        {
            return;
        }

        const partialVault = {}
        let updatedVault = false;

        if (newVault.signatureSecret)
        {
            partialVault[nameof<Vault>("signatureSecret")] = newVault.signatureSecret;
            updatedVault = true;
        }

        if (newVault.currentSignature)
        {
            partialVault[nameof<Vault>("currentSignature")] = newVault.currentSignature;
            updatedVault = true;
        }

        if (newVault.name)
        {
            partialVault[nameof<Vault>("name")] = newVault.name;
            updatedVault = true;
        }

        if (updatedVault)
        {
            transaction.overrideEntity(newVault.vaultID, partialVault, () => this);
        }

        if (newVault.vaultStoreState && newVault.vaultStoreState.vaultStoreStateID)
        {
            if (currentVault.vaultStoreState?.entityState == EntityState.Updated)
            {
                // TODO: merge changes between states
            }
            else
            {
                const partialVaultStoreState: DeepPartial<VaultStoreState> = StoreState.getUpdatedPropertiesFromObject(newVault.vaultStoreState);
                transaction.overrideEntity(newVault.vaultStoreState.vaultStoreStateID, partialVaultStoreState, () => environment.repositories.vaultStoreStates);
            }
        }

        if (newVault.passwordStoreState && newVault.passwordStoreState.passwordStoreStateID)
        {
            if (currentVault.passwordStoreState?.entityState == EntityState.Updated)
            {
                // TODO: merge changes between states
            }
            else 
            {
                const partialPasswordStoreState: DeepPartial<PasswordStoreState> = StoreState.getUpdatedPropertiesFromObject(newVault.passwordStoreState);
                transaction.overrideEntity(newVault.passwordStoreState.passwordStoreStateID, partialPasswordStoreState, () => environment.repositories.passwordStoreStates);
            }
        }

        if (newVault.valueStoreState && newVault.valueStoreState.valueStoreStateID)
        {
            if (currentVault.valueStoreState?.entityState == EntityState.Updated)
            {
                // TODO: merge changes between states
            }
            else 
            {
                const partialValueStoreState: DeepPartial<ValueStoreState> = StoreState.getUpdatedPropertiesFromObject(newVault.valueStoreState);
                transaction.overrideEntity(newVault.valueStoreState.valueStoreStateID, partialValueStoreState, () => environment.repositories.valueStoreStates);
            }
        }

        if (newVault.filterStoreState && newVault.filterStoreState.filterStoreStateID)
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
                const partialFilterStoreState: DeepPartial<FilterStoreState> = StoreState.getUpdatedPropertiesFromObject(newVault.filterStoreState);
                transaction.overrideEntity(newVault.filterStoreState.filterStoreStateID, partialFilterStoreState, () => environment.repositories.filterStoreStates);
            }
        }

        if (newVault.groupStoreState && newVault.groupStoreState.groupStoreStateID)
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
                const partialGroupStoreState: DeepPartial<GroupStoreState> = StoreState.getUpdatedPropertiesFromObject(newVault.groupStoreState);
                transaction.overrideEntity(newVault.groupStoreState.groupStoreStateID, partialGroupStoreState, () => environment.repositories.groupStoreStates);
            }
        }
    }

    public async deleteFromServer(vault: Partial<Vault>)
    {
        if (!vault.vaultID || vault.userVaults?.length == 0)
        {
            return;
        }

        const deleteVaultPromise = await this.repository.createQueryBuilder()
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