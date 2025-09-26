import { environment } from "../../Environment";
import { Vault } from "../Entities/Vault";
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
import { backupData, checkMergeMissingData, getCurrentUserDataIdentifiersAndKeys } from "../../Helpers/RepositoryHelper";
import { StoreState } from "../Entities/States/StoreState";
import { User } from "../Entities/User";
import { safetifyMethod } from "../../Helpers/RepositoryHelper";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import errorCodes from "@vaultic/shared/Types/ErrorCodes";
import { CondensedVaultData, EntityState } from "@vaultic/shared/Types/Entities";
import { DeepPartial, hasValue, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { IVaultRepository } from "../../Types/Repositories";
import { ChangeTracking } from "../Entities/ChangeTracking";
import { CurrentUserDataIdentifiersAndKeys, VaultsAndKeys } from "../../Types/Responses";
import { Member, Organization } from "@vaultic/shared/Types/DataTypes";
import { AddedOrgInfo, AddedVaultMembersInfo, ClientChangeTrackingType, ClientVaultChangeTrackings, ModifiedOrgMember, ServerPermissions, UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";
import { memberArrayToModifiedOrgMemberWithoutVaultKey, memberArrayToUserIDArray, organizationArrayToOrganizationIDArray, vaultAddedMembersToOrgMembers, vaultAddedOrgsToAddedOrgInfo } from "../../Helpers/MemberHelper";
import { UpdateVaultData } from "@vaultic/shared/Types/Repositories";
import { defaultFilterStoreState, defaultGroupStoreState, defaultPasswordStoreState, defaultValueStoreState, defaultVaultStoreState, StoreType, VaultStoreStates } from "@vaultic/shared/Types/Stores";
import { StoreStateRepository } from "./StoreState/StoreStateRepository";
import { StoreRetriever } from "../../Types/Parameters";
import { Algorithm, VaulticKey } from "@vaultic/shared/Types/Keys";
import axiosHelper from "../../Server/AxiosHelper";
import { userDataE2EEncryptedFieldTree } from "../../Types/FieldTree";

class VaultRepository extends VaulticRepository<Vault> implements IVaultRepository
{
    protected getRepository(): Repository<Vault> | undefined
    {
        return environment.databaseDataSouce.getRepository(Vault);
    }

    public async getAllVaultIDs(): Promise<Set<number>>
    {
        const vaults = await this.repository.find();
        return new Set(vaults.map(v => v.vaultID));
    }

    public async setLastUsedVault(userID: number, userVaultID: number)
    {
        const transaction = new Transaction();

        const currentVaults: Vault[] = await this.repository.createQueryBuilder("vaults")
            .leftJoinAndSelect("vaults.userVaults", "userVaults")
            .where("userVaults.userID = :userID", { userID: userID })
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
            .where("userVaults.userID = :userID", { userID: userID })
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

    public async createNewVault(masterKey: string, name: string, shared: boolean, currentUser?: Partial<User>, addedOrganizations?: Organization[],
        addedMembers?: Member[]): Promise<boolean | [UserVault, Vault]>
    {
        const vaultKey: string = JSON.stringify(environment.utilities.crypt.generateSymmetricKey());

        let orgsAndUserKeys: AddedOrgInfo;
        if (currentUser && addedOrganizations && addedOrganizations.length > 0)
        {
            orgsAndUserKeys = await vaultAddedOrgsToAddedOrgInfo(currentUser.userID, vaultKey, addedOrganizations);
        }

        let modifiedOrgMembers: AddedVaultMembersInfo;
        if (currentUser && addedMembers && addedMembers.length > 0)
        {
            modifiedOrgMembers = await vaultAddedMembersToOrgMembers(currentUser.userID, vaultKey, addedMembers);
        }

        const response = await vaulticServer.vault.create(name, shared, orgsAndUserKeys, modifiedOrgMembers);
        if (!response.Success)
        {
            return false;
        }

        const userVault = new UserVault().makeReactive();
        userVault.vaultPreferencesStoreState = new VaultPreferencesStoreState().makeReactive();

        const vault = new Vault().makeReactive();
        vault.lastUsed = true;
        vault.name = name;
        vault.shared = shared;
        vault.isArchived = false;
        vault.vaultStoreState = new VaultStoreState().makeReactive();
        vault.passwordStoreState = new PasswordStoreState().makeReactive();
        vault.valueStoreState = new ValueStoreState().makeReactive();
        vault.filterStoreState = new FilterStoreState().makeReactive();
        vault.groupStoreState = new GroupStoreState().makeReactive();
        vault.lastLoadedChangeVersion = 0;

        userVault.vault = vault;
        vault.userVaults = [userVault];

        userVault.userVaultID = response.UserVaultID!;
        userVault.userOrganizationID = response.UserOrganizationID!;
        userVault.vaultID = response.VaultID!;
        userVault.isOwner = true;
        userVault.vaultPreferencesStoreState.userVaultID = response.UserVaultID!;
        userVault.vaultPreferencesStoreState.vaultPreferencesStoreStateID = response.VaultPreferencesStoreStateID!;
        userVault.vaultPreferencesStoreState.state = "{}";
        userVault.vaultKey = vaultKey;
        userVault.lastLoadedChangeVersion = 0;

        vault.vaultID = response.VaultID!;
        vault.vaultStoreState.vaultID = response.VaultID!;
        vault.vaultStoreState.vaultStoreStateID = response.VaultStoreStateID!;
        vault.vaultStoreState.state = JSON.stringify(defaultVaultStoreState());
        vault.passwordStoreState.vaultID = response.VaultID!;
        vault.passwordStoreState.passwordStoreStateID = response.PasswordStoreStateID!;
        vault.passwordStoreState.state = JSON.stringify(defaultPasswordStoreState());
        vault.valueStoreState.vaultID = response.VaultID!;
        vault.valueStoreState.valueStoreStateID = response.ValueStoreStateID!;
        vault.valueStoreState.state = JSON.stringify(defaultValueStoreState());
        vault.filterStoreState.vaultID = response.VaultID!;
        vault.filterStoreState.filterStoreStateID = response.FilterStoreStateID!;
        vault.filterStoreState.state = JSON.stringify(defaultFilterStoreState());
        vault.groupStoreState.vaultID = response.VaultID!;
        vault.groupStoreState.groupStoreStateID = response.GroupStoreStateID!;
        vault.groupStoreState.state = JSON.stringify(defaultGroupStoreState());

        return [userVault, vault];
    }

    public async createNewVaultForUser(masterKey: string, updateVaultData: string): Promise<TypedMethodResponse<CondensedVaultData | undefined>>
    {
        return await safetifyMethod(this, internalCreateNewVaultForUser);

        async function internalCreateNewVaultForUser(this: VaultRepository): Promise<TypedMethodResponse<CondensedVaultData>>
        {
            if (!environment.cache.currentUser)
            {
                return TypedMethodResponse.fail(errorCodes.NO_USER);
            }

            const parsedUpdatedVaultData: UpdateVaultData = JSON.vaulticParse(updateVaultData);

            const vaultData = await this.createNewVault(masterKey, parsedUpdatedVaultData.name, parsedUpdatedVaultData.shared, environment.cache.currentUser,
                parsedUpdatedVaultData.addedOrganizations, parsedUpdatedVaultData.addedMembers);
            if (!vaultData)
            {
                return TypedMethodResponse.fail(undefined, undefined, "No Vault Data");
            }

            const userVault: UserVault = vaultData[0];
            const vault: Vault = vaultData[1];

            userVault.userID = environment.cache.currentUser.userID;

            const transaction = new Transaction();

            // Order matters here
            transaction.insertEntity(vault, userVault.vaultKey, () => environment.repositories.vaults);
            transaction.insertEntity(vault.vaultStoreState, userVault.vaultKey, () => environment.repositories.vaultStoreStates);
            transaction.insertEntity(vault.passwordStoreState, userVault.vaultKey, () => environment.repositories.passwordStoreStates);
            transaction.insertEntity(vault.valueStoreState, userVault.vaultKey, () => environment.repositories.valueStoreStates);
            transaction.insertEntity(vault.filterStoreState, userVault.vaultKey, () => environment.repositories.filterStoreStates);
            transaction.insertEntity(vault.groupStoreState, userVault.vaultKey, () => environment.repositories.groupStoreStates);

            transaction.insertEntity(userVault, masterKey, () => environment.repositories.userVaults);
            transaction.insertEntity(userVault.vaultPreferencesStoreState, "", () => environment.repositories.vaultPreferencesStoreStates);

            if (!(await transaction.commit()))
            {
                await vaulticServer.vault.failedToSaveVault(userVault.userOrganizationID, userVault.userVaultID);
                return TypedMethodResponse.transactionFail();
            }

            const backupResponse = await backupData(masterKey);
            if (!backupResponse.success)
            {
                return backupResponse;
            }

            if (parsedUpdatedVaultData.setAsActive)
            {
                await this.setLastUsedVault(environment.cache.currentUser.userID, userVault.userVaultID);
            }

            const uvData = await environment.repositories.userVaults.getVerifiedAndDecryt(masterKey, undefined, undefined, [userVault.userVaultID], true);
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
            if (!environment.cache.currentUser?.userID)
            {
                return TypedMethodResponse.fail(errorCodes.NO_USER);
            }

            const userVaults = await environment.repositories.userVaults.getVerifiedAndDecryt(masterKey, undefined, undefined, [userVaultID], true);
            if (userVaults && userVaults.length == 1)
            {
                if (!(await this.setLastUsedVault(environment.cache.currentUser.userID, userVaultID)))
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed To Set Last User");
                }

                return TypedMethodResponse.success(userVaults[0]);
            }

            return TypedMethodResponse.fail(undefined, undefined, "No User Vault");
        }
    }

    public async updateVault(masterKey: string, updateVaultData: string): Promise<TypedMethodResponse<boolean | undefined>>
    {
        return await safetifyMethod(this, internalUpdateVault);

        async function internalUpdateVault(this: VaultRepository): Promise<TypedMethodResponse<boolean>>
        {
            if (!environment.cache.currentUser)
            {
                return TypedMethodResponse.failWithValue(false);
            }

            const parsedUpdateVaultData: UpdateVaultData = JSON.vaulticParse(updateVaultData);
            const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, [parsedUpdateVaultData.userVaultID]);

            if (userVaults[0].length != 1)
            {
                return TypedMethodResponse.fail(undefined, undefined, "No UserVault");
            }

            const oldVault = userVaults[0][0].vault.makeReactive();

            let needToUpdateSharing = false;
            let needsToUpdateVault = false;

            let addedOrgInfo: AddedOrgInfo;
            let removedOrgIDs: number[];

            let addedVaultMemberInfo: AddedVaultMembersInfo;
            let updatedModifiedOrgMembers: ModifiedOrgMember[];
            let removedMemberIDs: number[];

            if (parsedUpdateVaultData.shared != undefined && parsedUpdateVaultData.shared != oldVault.shared)
            {
                oldVault.shared = parsedUpdateVaultData.shared;

                needToUpdateSharing = true;
                needsToUpdateVault = true;
            }

            if (parsedUpdateVaultData.isArchived != undefined && parsedUpdateVaultData.isArchived != oldVault.isArchived)
            {
                oldVault.isArchived = parsedUpdateVaultData.isArchived;
                needsToUpdateVault = true;
            }

            if (parsedUpdateVaultData.addedOrganizations != undefined && parsedUpdateVaultData.addedOrganizations.length > 0)
            {
                addedOrgInfo = await vaultAddedOrgsToAddedOrgInfo(environment.cache.currentUser.userID, userVaults[1][0], parsedUpdateVaultData.addedOrganizations);
                needToUpdateSharing = true;
            }

            if (parsedUpdateVaultData.removedOrganizations != undefined && parsedUpdateVaultData.removedOrganizations.length > 0)
            {
                removedOrgIDs = organizationArrayToOrganizationIDArray(parsedUpdateVaultData.removedOrganizations);
                needToUpdateSharing = true;
            }

            if (parsedUpdateVaultData.addedMembers != undefined && parsedUpdateVaultData.addedMembers.length > 0)
            {
                addedVaultMemberInfo = await vaultAddedMembersToOrgMembers(environment.cache.currentUser.userID, userVaults[1][0], parsedUpdateVaultData.addedMembers);
                needToUpdateSharing = true;
            }

            if (parsedUpdateVaultData.updatedMembers != undefined && parsedUpdateVaultData.updatedMembers.length > 0)
            {
                updatedModifiedOrgMembers = memberArrayToModifiedOrgMemberWithoutVaultKey(parsedUpdateVaultData.updatedMembers);
                needToUpdateSharing = true;
            }

            if (parsedUpdateVaultData.removedMembers != undefined && parsedUpdateVaultData.removedMembers.length > 0)
            {
                removedMemberIDs = memberArrayToUserIDArray(parsedUpdateVaultData.removedMembers);
                needToUpdateSharing = true;
            }

            if (needToUpdateSharing)
            {
                const response = await vaulticServer.vault.updateVault(parsedUpdateVaultData.userVaultID, userVaults[0][0].userOrganizationID,
                    parsedUpdateVaultData.shared, addedOrgInfo, removedOrgIDs, addedVaultMemberInfo, updatedModifiedOrgMembers, removedMemberIDs);

                if (!response.Success)
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed to update vault on server");
                }
            }

            if (parsedUpdateVaultData.name != undefined && parsedUpdateVaultData.name != oldVault.name)
            {
                oldVault.name = parsedUpdateVaultData.name;
                needsToUpdateVault = true;
            }

            if (needsToUpdateVault)
            {
                const transaction = new Transaction();

                const vaultKey = userVaults[1][0];
                transaction.updateEntity(oldVault, vaultKey, () => this);

                const success = await transaction.commit();
                if (!success)
                {
                    return TypedMethodResponse.fail();
                }

                await backupData(masterKey);
            }

            return TypedMethodResponse.success();
        }
    }

    public async saveVaultData(masterKey: string, userVaultID: number, changes: string, hintID?: string): Promise<TypedMethodResponse<boolean | undefined>>
    {
        return await safetifyMethod(this, internalSaveVaultData);

        async function internalSaveVaultData(this: VaultRepository): Promise<TypedMethodResponse<boolean>>
        {
            if (!environment.cache.currentUser?.userID)
            {
                return TypedMethodResponse.fail(errorCodes.NO_USER, "saveVaultData");
            }

            const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, [userVaultID]);
            if (userVaults[0].length != 1)
            {
                return TypedMethodResponse.fail(undefined, undefined, "No UserVault");
            }

            const vaultKey = userVaults[1][0];
            const transaction = new Transaction();

            ChangeTracking.creteAndInsert(vaultKey, ClientChangeTrackingType.Vault, changes, transaction, environment.cache.currentUser.userID,
                userVaults[0][0].userVaultID, userVaults[0][0].vaultID, hintID);

            const saved = await transaction.commit();
            if (!saved)
            {
                return TypedMethodResponse.transactionFail();
            }

            return TypedMethodResponse.success();
        }
    }

    public async getEntitiesThatNeedToBeBackedUp(masterKey: string): Promise<TypedMethodResponse<VaultsAndKeys | undefined>>
    {
        if (!environment.cache.currentUser?.userID)
        {
            TypedMethodResponse.fail();
        }

        let userVaultsWithVaultsToBackup = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey,
            undefined, environment.cache.currentUser.userID, vaultQuery);

        if (userVaultsWithVaultsToBackup[0].length == 0)
        {
            return TypedMethodResponse.success(new VaultsAndKeys())
        }

        const partialVaultsToBackup: Partial<Vault>[] = [];
        const vaultKeys: string[] = [];

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

            // Kind of sucks to manually set this instead of it being set from getBackup() but oh well
            vaultBackup[nameof<UserVault>("userOrganizationID")] = userVaultsWithVaultsToBackup[0][i].userOrganizationID;
            vaultBackup[nameof<UserVault>("userVaultID")] = userVaultsWithVaultsToBackup[0][i].userVaultID;

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

            vaultKeys.push(userVaultsWithVaultsToBackup[1][i]);
            partialVaultsToBackup.push(vaultBackup);
        }

        return TypedMethodResponse.success(new VaultsAndKeys(vaultKeys, partialVaultsToBackup));

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
                .where("userVaults.userID = :userID", { userID: environment.cache.currentUser.userID })
                .andWhere("(userVaults.isOwner = true OR userVaults.permissions = :permissions)", { permissions: ServerPermissions.ViewAndEdit })
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

    public async postBackupEntitiesUpdates(key: string, entities: DeepPartial<Vault>[], transaction: Transaction): Promise<boolean> 
    {
        if (!environment.cache.currentUser?.userID)
        {
            return false;
        }

        let succeeded = true;

        const deletedVaults: DeepPartial<Vault>[] = [];
        const otherVaults: DeepPartial<Vault>[] = [];

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
            const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(key, vaultIDs, environment.cache.currentUser.userID,
                (repository) => userVaultQuery(repository, vaultIDs));

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
        }

        return succeeded;

        function userVaultQuery(repository: Repository<UserVault>, vaultIDs: number[])
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
                .where('userVault.userID = :userID', { userID: environment.cache.currentUser.userID })
                .andWhere('userVault.vaultID IN (:...vaultIDs)', { vaultIDs })
                .getMany();
        }
    }

    public async deleteVault(masterKey: string, userVaultID: number): Promise<TypedMethodResponse<boolean | undefined>>
    {
        return await safetifyMethod(this, internalArchiveVault);

        async function internalArchiveVault(this: VaultRepository): Promise<TypedMethodResponse<boolean>>
        {
            const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, [userVaultID]);
            if (userVaults[0].length == 0)
            {
                return TypedMethodResponse.fail(undefined, undefined, "No UserVaults");
            }

            const userVault = userVaults[0][0];
            if (!userVault.vault.isArchived)
            {
                return TypedMethodResponse.fail(undefined, undefined, "Can't delete unarchived vault");
            }

            const response = await vaulticServer.vault.deleteVault(userVault.userOrganizationID, userVault.userVaultID);
            if (!response.Success)
            {
                return TypedMethodResponse.fail(undefined, undefined, "Failed to delete vault on server");
            }

            const transaction = new Transaction();
            transaction.deleteEntity(userVault.vaultID, () => this);

            if (!(await transaction.commit()))
            {
                return TypedMethodResponse.transactionFail();
            }

            return TypedMethodResponse.success(true);
        }
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

    public async updateVaultFromServer(
        newVault: DeepPartial<Vault>,
        transaction: Transaction)
    {
        if (!newVault.vaultID)
        {
            return;
        }

        const partialVault = {}
        let updatedVault = false;

        if (hasValue(newVault.currentSignature))
        {
            partialVault[nameof<Vault>("currentSignature")] = newVault.currentSignature;
            updatedVault = true;
        }

        if (hasValue(newVault.name))
        {
            partialVault[nameof<Vault>("name")] = newVault.name;
            updatedVault = true;
        }

        if (hasValue(newVault.shared))
        {
            partialVault[nameof<Vault>("shared")] = newVault.shared;
            updatedVault = true;
        }

        if (hasValue(newVault.isArchived))
        {
            partialVault[nameof<Vault>("isArchived")] = newVault.isArchived;
            updatedVault = true;
        }

        if (hasValue(newVault.lastLoadedChangeVersion))
        {
            partialVault[nameof<Vault>("lastLoadedChangeVersion")] = newVault.lastLoadedChangeVersion;
            updatedVault = true;
        }

        if (updatedVault)
        {
            transaction.overrideEntity(newVault.vaultID, partialVault, () => this);
        }

        if (newVault.vaultStoreState && newVault.vaultStoreState.vaultStoreStateID)
        {
            const partialVaultStoreState: DeepPartial<VaultStoreState> = StoreState.getUpdatedPropertiesFromObject(newVault.vaultStoreState);
            if (Object.keys(partialVaultStoreState).length > 0)
            {
                transaction.overrideEntity(newVault.vaultStoreState.vaultStoreStateID, partialVaultStoreState, () => environment.repositories.vaultStoreStates);
            }
        }

        if (newVault.passwordStoreState && newVault.passwordStoreState.passwordStoreStateID)
        {
            const partialPasswordStoreState: DeepPartial<PasswordStoreState> = StoreState.getUpdatedPropertiesFromObject(newVault.passwordStoreState);
            if (Object.keys(partialPasswordStoreState).length > 0)
            {
                transaction.overrideEntity(newVault.passwordStoreState.passwordStoreStateID, partialPasswordStoreState, () => environment.repositories.passwordStoreStates);
            }
        }

        if (newVault.valueStoreState && newVault.valueStoreState.valueStoreStateID)
        {
            const partialValueStoreState: DeepPartial<ValueStoreState> = StoreState.getUpdatedPropertiesFromObject(newVault.valueStoreState);
            if (Object.keys(partialValueStoreState).length > 0)
            {
                transaction.overrideEntity(newVault.valueStoreState.valueStoreStateID, partialValueStoreState, () => environment.repositories.valueStoreStates);
            }
        }

        if (newVault.filterStoreState && newVault.filterStoreState.filterStoreStateID)
        {
            const partialFilterStoreState: DeepPartial<FilterStoreState> = StoreState.getUpdatedPropertiesFromObject(newVault.filterStoreState);
            if (Object.keys(partialFilterStoreState).length > 0)
            {
                transaction.overrideEntity(newVault.filterStoreState.filterStoreStateID, partialFilterStoreState, () => environment.repositories.filterStoreStates);
            }
        }

        if (newVault.groupStoreState && newVault.groupStoreState.groupStoreStateID)
        {
            const partialGroupStoreState: DeepPartial<GroupStoreState> = StoreState.getUpdatedPropertiesFromObject(newVault.groupStoreState);
            if (Object.keys(partialGroupStoreState).length > 0)
            {
                transaction.overrideEntity(newVault.groupStoreState.groupStoreStateID, partialGroupStoreState, () => environment.repositories.groupStoreStates);
            }
        }
    }

    public async updateVaultChanges(
        key: string,
        vault: ClientVaultChangeTrackings,
        serverVault: DeepPartial<Vault> | undefined,
        serverChanges: ClientVaultChangeTrackings | undefined,
        localChanges: ChangeTracking[],
        existingUserChanges: ClientVaultChangeTrackings | undefined,
        transaction: Transaction)
    {
        const states = this.getStoreRetriever(key, vault.vaultID, serverVault);
        const clientUserChangesToPush: ClientVaultChangeTrackings =
        {
            userVaultID: vault.userVaultID,
            userOrganizationID: vault.userOrganizationID,
            vaultID: vault.vaultID,
            lastLoadedChangeVersion: vault.lastLoadedChangeVersion,
            allChanges: []
        };

        const response = await StoreStateRepository.mergeData(key, existingUserChanges, serverChanges, localChanges, states, clientUserChangesToPush, transaction);
        if (clientUserChangesToPush.lastLoadedChangeVersion != vault.lastLoadedChangeVersion)
        {
            const currentVaultEntity = await this.retrieveAndVerifyReactive(key, (repository) => repository.findOneBy({
                vaultID: vault.vaultID
            }));

            if (currentVaultEntity)
            {
                currentVaultEntity.lastLoadedChangeVersion = clientUserChangesToPush.lastLoadedChangeVersion;
                transaction.updateEntity(currentVaultEntity, key, () => this);
            }
        }

        return { needsToRePushData: response, changes: clientUserChangesToPush };
    }

    public async getStoreStates(masterKey: string, userVaultID: number, storeStatesToRetrieve: CondensedVaultData): Promise<TypedMethodResponse<DeepPartial<CondensedVaultData> | undefined>>
    {
        return await safetifyMethod(this, internalGetStoreStates);

        async function internalGetStoreStates(this: VaultRepository): Promise<TypedMethodResponse<DeepPartial<CondensedVaultData>>>
        {
            const statesToGet: VaultStoreStates[] = [];
            if (storeStatesToRetrieve.vaultStoreState)
            {
                statesToGet.push("vaultStoreState");
            }

            if (storeStatesToRetrieve.passwordStoreState)
            {
                statesToGet.push("passwordStoreState");
            }

            if (storeStatesToRetrieve.valueStoreState)
            {
                statesToGet.push("valueStoreState");
            }

            if (storeStatesToRetrieve.filterStoreState)
            {
                statesToGet.push("filterStoreState");
            }

            if (storeStatesToRetrieve.groupStoreState)
            {
                statesToGet.push("groupStoreState");
            }

            const condensedVaults = await environment.repositories.userVaults.getVerifiedAndDecryt(masterKey, undefined, statesToGet, [userVaultID]);
            if (!condensedVaults || condensedVaults.length != 1)
            {
                return TypedMethodResponse.fail(undefined, "", "No user vaults");
            }

            const returnStates: DeepPartial<CondensedVaultData> = {};
            if (storeStatesToRetrieve.vaultStoreState)
            {
                returnStates[nameof<Vault>("vaultStoreState")] = condensedVaults[0].vaultStoreState;
            }

            if (storeStatesToRetrieve.passwordStoreState)
            {
                returnStates[nameof<Vault>("passwordStoreState")] = condensedVaults[0].passwordStoreState;
            }

            if (storeStatesToRetrieve.valueStoreState)
            {
                returnStates[nameof<Vault>("valueStoreState")] = condensedVaults[0].valueStoreState;
            }

            if (storeStatesToRetrieve.filterStoreState)
            {
                returnStates[nameof<Vault>("filterStoreState")] = condensedVaults[0].filterStoreState;
            }

            if (storeStatesToRetrieve.groupStoreState)
            {
                returnStates[nameof<Vault>("groupStoreState")] = condensedVaults[0].groupStoreState;
            }

            return TypedMethodResponse.success(returnStates);
        }
    }

    public async syncVaults(email: string, plainMasterKey?: string, reloadAllData?: boolean): Promise<TypedMethodResponse<string | undefined>>
    {
        const onFinish = async () => environment.cache.isSyncing = false;
        return await safetifyMethod(this, internalSyncVaults, onFinish, onFinish);

        async function internalSyncVaults(this: VaultRepository): Promise<TypedMethodResponse<string>>
        {
            try
            {
                environment.cache.isSyncing = true;

                if (reloadAllData)
                {
                    const transaction = new Transaction();
                    transaction.raw("DELETE FROM users");
                    transaction.raw("DELETE FROM vaults");
                    transaction.raw("DELETE FROM userVaults");
                    transaction.raw("DELETE FROM changeTrackings");

                    if (!(await transaction.commit()))
                    {
                        return TypedMethodResponse.fail(undefined, undefined, "Unable to clear current data");
                    }
                }

                let currentSignatures: CurrentUserDataIdentifiersAndKeys = { identifiers: {}, keys: [] };
                let masterKeyVaulticKey: string | undefined = undefined;

                if (reloadAllData !== true && !plainMasterKey)
                {
                    if (environment.cache.masterKey)
                    {
                        masterKeyVaulticKey = environment.cache.masterKey;
                        const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKeyVaulticKey);
                        if (!currentUser)
                        {
                            return TypedMethodResponse.fail(errorCodes.NO_USER);
                        }

                        currentSignatures = await getCurrentUserDataIdentifiersAndKeys(masterKeyVaulticKey, currentUser);
                    }
                }

                const result = await vaulticServer.vault.syncVaults(currentSignatures.identifiers);
                if (!result.Success)
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Syncing Vaults");
                }

                const decryptedResponse = await axiosHelper.api.decryptEndToEndData(userDataE2EEncryptedFieldTree, result);
                if (!decryptedResponse.success)
                {
                    return decryptedResponse;
                }

                // We weren't passed a master key because we don't have a user, get it from the payload
                if (plainMasterKey)
                {
                    let alg = (decryptedResponse.value.userDataPayload as UserDataPayload).user?.masterKeyEncryptionAlgorithm;
                    if (!alg)
                    {
                        alg = Algorithm.XCHACHA20_POLY1305;
                    }

                    const vaulticKey: VaulticKey =
                    {
                        algorithm: alg,
                        key: plainMasterKey
                    };

                    masterKeyVaulticKey = JSON.stringify(vaulticKey);
                }

                const mergeDataResponse = await checkMergeMissingData(masterKeyVaulticKey, email, currentSignatures.keys, currentSignatures.identifiers, decryptedResponse.value.userDataPayload,
                    undefined, undefined, reloadAllData);

                if (!mergeDataResponse.success)
                {
                    return mergeDataResponse;
                }

                if (!environment.cache.currentUser)
                {
                    const currentUserResponse = await environment.repositories.users.setCurrentUser(masterKeyVaulticKey, email);
                    if (!currentUserResponse.success)
                    {
                        return currentUserResponse;
                    }
                }

                return TypedMethodResponse.success(masterKeyVaulticKey);
            }
            catch (e)
            {
                await environment.repositories.logs.log(undefined, JSON.stringify(e));
            }

            return TypedMethodResponse.fail();
        }
    }

    private getStoreRetriever(vaultKey: string, vaultID: number, serverVault: DeepPartial<Vault> | undefined): StoreRetriever
    {
        const states: StoreRetriever = {};
        states[StoreType.Vault] =
        {
            saveKey: vaultKey,
            repository: environment.repositories.vaultStoreStates,
            serverState: serverVault?.vaultStoreState?.state,
            getState: async () =>
            {
                const state = await environment.repositories.vaultStoreStates.retrieveAndVerify(vaultKey,
                    (repository) => repository.findOneBy({
                        vaultID: vaultID
                    }));

                return state[1];
            }
        };

        states[StoreType.Password] =
        {
            saveKey: vaultKey,
            repository: environment.repositories.passwordStoreStates,
            serverState: serverVault?.passwordStoreState?.state,
            getState: async () =>
            {
                const state = await environment.repositories.passwordStoreStates.retrieveAndVerify(vaultKey,
                    (repository) => repository.findOneBy({
                        vaultID: vaultID
                    }));

                return state[1];
            }
        }

        states[StoreType.Value] =
        {
            saveKey: vaultKey,
            repository: environment.repositories.valueStoreStates,
            serverState: serverVault?.valueStoreState?.state,
            getState: async () =>
            {
                const state = await environment.repositories.valueStoreStates.retrieveAndVerify(vaultKey,
                    (repository) => repository.findOneBy({
                        vaultID: vaultID
                    }));

                return state[1];
            }
        }

        states[StoreType.Filter] =
        {
            saveKey: vaultKey,
            repository: environment.repositories.filterStoreStates,
            serverState: serverVault?.filterStoreState?.state,
            getState: async () =>
            {
                const state = await environment.repositories.filterStoreStates.retrieveAndVerify(vaultKey,
                    (repository) => repository.findOneBy({
                        vaultID: vaultID
                    }));

                return state[1];
            }
        }

        states[StoreType.Group] =
        {
            saveKey: vaultKey,
            repository: environment.repositories.groupStoreStates,
            serverState: serverVault?.groupStoreState?.state,
            getState: async () =>
            {
                const state = await environment.repositories.groupStoreStates.retrieveAndVerify(vaultKey,
                    (repository) => repository.findOneBy({
                        vaultID: vaultID
                    }));

                return state[1];
            }
        }

        return states;
    }
}

const vaultRepository: VaultRepository = new VaultRepository();
export default vaultRepository;
export type VaultRepositoryType = typeof vaultRepository;