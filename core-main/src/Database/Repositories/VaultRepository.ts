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
import { backupData, checkMergeMissingData, getUserDataSignatures } from "../../Helpers/RepositoryHelper";
import { StoreState } from "../Entities/States/StoreState";
import { User } from "../Entities/User";
import { safetifyMethod } from "../../Helpers/RepositoryHelper";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import errorCodes from "@vaultic/shared/Types/ErrorCodes";
import { CondensedVaultData, EntityState } from "@vaultic/shared/Types/Entities";
import { DeepPartial, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { IVaultRepository } from "../../Types/Repositories";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { ChangeTracking } from "../Entities/ChangeTracking";
import { VaultsAndKeys } from "../../Types/Responses";
import { Member, Organization } from "@vaultic/shared/Types/DataTypes";
import { AddedOrgInfo, AddedVaultMembersInfo, ModifiedOrgMember, ServerPermissions } from "@vaultic/shared/Types/ClientServerTypes";
import { memberArrayToModifiedOrgMemberWithoutVaultKey, memberArrayToUserIDArray, organizationArrayToOrganizationIDArray, vaultAddedMembersToOrgMembers, vaultAddedOrgsToAddedOrgInfo } from "../../Helpers/MemberHelper";
import { UpdateVaultData } from "@vaultic/shared/Types/Repositories";

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

    public async createNewVault(name: string, shared: boolean, addedOrganizations: Organization[],
        addedMembers: Member[]): Promise<boolean | [UserVault, Vault, string]>
    {
        const vaultKey = environment.utilities.crypt.generateSymmetricKey();

        let orgsAndUserKeys: AddedOrgInfo;
        if (addedOrganizations.length > 0)
        {
            orgsAndUserKeys = await vaultAddedOrgsToAddedOrgInfo(vaultKey, addedOrganizations);
        }

        let modifiedOrgMembers: AddedVaultMembersInfo;
        if (addedMembers.length > 0)
        {
            modifiedOrgMembers = await vaultAddedMembersToOrgMembers(vaultKey, addedMembers);
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

        userVault.vault = vault;
        vault.userVaults = [userVault];

        userVault.userVaultID = response.UserVaultID!;
        userVault.userOrganizationID = response.UserOrganizationID!;
        userVault.vaultID = response.VaultID!;
        userVault.isOwner = true;
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

    public async createNewVaultForUser(masterKey: string, name: string, shared: boolean, setAsActive: boolean,
        addedOrganizations: Organization[], addedMembers: Member[]): Promise<TypedMethodResponse<CondensedVaultData | undefined>>
    {
        return await safetifyMethod(this, internalCreateNewVaultForUser);

        async function internalCreateNewVaultForUser(this: VaultRepository): Promise<TypedMethodResponse<CondensedVaultData>>
        {
            const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
            if (!currentUser)
            {
                return TypedMethodResponse.fail(errorCodes.NO_USER);
            }

            const vaultData = await this.createNewVault(name, shared, addedOrganizations, addedMembers);
            if (!vaultData)
            {
                return TypedMethodResponse.fail(undefined, undefined, "No Vault Data");
            }

            const userVault: UserVault = vaultData[0];
            const vault: Vault = vaultData[1];
            const vaultKey: string = vaultData[2];

            const encryptedVaultKey = await environment.utilities.crypt.symmetricEncrypt(masterKey, vaultKey);
            if (!encryptedVaultKey.success)
            {
                return TypedMethodResponse.fail(errorCodes.EC_ENCRYPTION_FAILED);
            }

            userVault.userID = currentUser.userID;
            userVault.user = currentUser;
            userVault.vaultKey = encryptedVaultKey.value;

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
                await vaulticServer.vault.failedToSaveVault(userVault.userOrganizationID, userVault.userVaultID);
                return TypedMethodResponse.transactionFail();
            }

            const backupResponse = await backupData(masterKey);
            if (!backupResponse)
            {
                return TypedMethodResponse.backupFail();
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

    public async updateVault(masterKey: string, updateVaultData: string): Promise<TypedMethodResponse<boolean | undefined>>
    {
        return await safetifyMethod(this, internalUpdateVault);

        async function internalUpdateVault(this: VaultRepository): Promise<TypedMethodResponse<boolean>>
        {
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
                addedOrgInfo = await vaultAddedOrgsToAddedOrgInfo(userVaults[1][0], parsedUpdateVaultData.addedOrganizations);
                needToUpdateSharing = true;
            }

            if (parsedUpdateVaultData.removedOrganizations != undefined && parsedUpdateVaultData.removedOrganizations.length > 0)
            {
                removedOrgIDs = organizationArrayToOrganizationIDArray(parsedUpdateVaultData.removedOrganizations);
                needToUpdateSharing = true;
            }

            if (parsedUpdateVaultData.addedMembers != undefined && parsedUpdateVaultData.addedMembers.length > 0)
            {
                addedVaultMemberInfo = await vaultAddedMembersToOrgMembers(userVaults[1][0], parsedUpdateVaultData.addedMembers);
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

    public async saveVaultData(masterKey: string, userVaultID: number, newData: string, currentData?: string): Promise<TypedMethodResponse<boolean | undefined>>
    {
        return await safetifyMethod(this, internalSaveVaultData);

        async function internalSaveVaultData(this: VaultRepository): Promise<TypedMethodResponse<boolean>>
        {
            const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, [userVaultID]);
            if (userVaults[0].length != 1)
            {
                return TypedMethodResponse.fail(undefined, undefined, "No UserVault");
            }

            const oldVault = userVaults[0][0].vault.makeReactive();
            const vaultKey = userVaults[1][0];

            const newVaultData: CondensedVaultData = JSON.vaulticParse(newData);
            const currentVaultData: CondensedVaultData | undefined = currentData ? JSON.vaulticParse(currentData) : undefined;

            const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
            if (!currentUser)
            {
                return TypedMethodResponse.fail(errorCodes.NO_USER, "saveVaultData");
            }

            const transaction = new Transaction();
            if (newVaultData.vaultStoreState)
            {
                const currentVaultState = JSON.vaulticParse(currentVaultData.vaultStoreState);
                const state = environment.repositories.changeTrackings.trackStateDifferences(currentUser.userID, masterKey, JSON.vaulticParse(newVaultData.vaultStoreState),
                    currentVaultState, transaction);

                if (!await (environment.repositories.vaultStoreStates.updateState(
                    oldVault.vaultStoreState.vaultStoreStateID, vaultKey, state, transaction)))
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed To Update VaultStoreState");
                }
            }

            if (newVaultData.passwordStoreState)
            {
                const currentPasswordState = JSON.vaulticParse(currentVaultData.passwordStoreState);
                const state = environment.repositories.changeTrackings.trackStateDifferences(currentUser.userID, masterKey, JSON.vaulticParse(newVaultData.passwordStoreState),
                    currentPasswordState, transaction);

                if (!await (environment.repositories.passwordStoreStates.updateState(
                    oldVault.passwordStoreState.passwordStoreStateID, vaultKey, state, transaction)))
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed To Update PasswordStoreState");
                }
            }

            if (newVaultData.valueStoreState)
            {
                const currentValueState = JSON.vaulticParse(currentVaultData.valueStoreState);
                const state = environment.repositories.changeTrackings.trackStateDifferences(currentUser.userID, masterKey, JSON.vaulticParse(newVaultData.valueStoreState),
                    currentValueState, transaction);

                if (!await (environment.repositories.valueStoreStates.updateState(
                    oldVault.valueStoreState.valueStoreStateID, vaultKey, state, transaction)))
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed To Update ValueStoreState");
                }
            }

            if (newVaultData.filterStoreState)
            {
                const currentFilterState = JSON.vaulticParse(currentVaultData.filterStoreState);
                const state = environment.repositories.changeTrackings.trackStateDifferences(currentUser.userID, masterKey, JSON.vaulticParse(newVaultData.filterStoreState),
                    currentFilterState, transaction);

                if (!await (environment.repositories.filterStoreStates.updateState(
                    oldVault.filterStoreState.filterStoreStateID, vaultKey, state, transaction)))
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed To Update FilterStoreState");
                }
            }

            if (newVaultData.groupStoreState)
            {
                const currentGroupState = JSON.vaulticParse(currentVaultData.groupStoreState);
                const state = environment.repositories.changeTrackings.trackStateDifferences(currentUser.userID, masterKey, JSON.vaulticParse(newVaultData.groupStoreState),
                    currentGroupState, transaction);

                if (!await (environment.repositories.groupStoreStates.updateState(
                    oldVault.groupStoreState.groupStoreStateID, vaultKey, state, transaction)))
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed To Update GroupStoreState");
                }
            }

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
        const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
        if (!currentUser)
        {
            TypedMethodResponse.fail();
        }

        let userVaultsWithVaultsToBackup = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey,
            undefined, currentUser, vaultQuery);

        if (userVaultsWithVaultsToBackup[0].length == 0)
        {
            return TypedMethodResponse.success(new VaultsAndKeys())
        }

        const partialVaultsToBackup: Partial<Vault>[] = [];
        const vaultKeys: string[] = [];

        console.log(`\nUser Vaults with vaults to backup: ${JSON.stringify(userVaultsWithVaultsToBackup[0])}\n`)
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
                .where("userVaults.userID = :userID", { userID: currentUser?.userID })
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
        const currentUser = await environment.repositories.users.getVerifiedCurrentUser(key);
        if (!currentUser)
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
            const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(key, vaultIDs, currentUser, (repository) => userVaultQuery(repository, vaultIDs));

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
                .where('userVault.userID = :userID', { userID: currentUser!.userID })
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

    public async updateFromServer(key: string, currentVault: DeepPartial<Vault>, newVault: DeepPartial<Vault>, changeTrackings: Dictionary<ChangeTracking>,
        transaction: Transaction)
    {
        if (!newVault.vaultID)
        {
            return;
        }

        const partialVault = {}
        let updatedVault = false;

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

        if (newVault.shared)
        {
            partialVault[nameof<Vault>("shared")] = newVault.shared;
            updatedVault = true;
        }

        if (newVault.isArchived)
        {
            partialVault[nameof<Vault>("isArchived")] = newVault.isArchived;
            updatedVault = true;
        }

        if (updatedVault)
        {
            transaction.overrideEntity(newVault.vaultID, partialVault, () => this);
        }

        let needsToRePushData = false;

        if (newVault.vaultStoreState && newVault.vaultStoreState.vaultStoreStateID)
        {
            if (currentVault.vaultStoreState?.entityState == EntityState.Updated)
            {
                if (!await (environment.repositories.vaultStoreStates.mergeStates(key, currentVault.vaultStoreState.vaultStoreStateID,
                    newVault.vaultStoreState, changeTrackings, transaction)))
                {
                    return;
                }

                needsToRePushData = true;
            }
            else
            {
                const partialVaultStoreState: DeepPartial<VaultStoreState> = StoreState.getUpdatedPropertiesFromObject(newVault.vaultStoreState);
                if (Object.keys(partialVaultStoreState).length > 0)
                {
                    transaction.overrideEntity(newVault.vaultStoreState.vaultStoreStateID, partialVaultStoreState, () => environment.repositories.vaultStoreStates);
                }
            }
        }

        if (newVault.passwordStoreState && newVault.passwordStoreState.passwordStoreStateID)
        {
            if (currentVault.passwordStoreState?.entityState == EntityState.Updated)
            {
                if (!await (environment.repositories.passwordStoreStates.mergeStates(key, currentVault.passwordStoreState.passwordStoreStateID,
                    newVault.passwordStoreState, changeTrackings, transaction)))
                {
                    return;
                }

                needsToRePushData = true;
            }
            else 
            {
                const partialPasswordStoreState: DeepPartial<PasswordStoreState> = StoreState.getUpdatedPropertiesFromObject(newVault.passwordStoreState);
                if (Object.keys(partialPasswordStoreState).length > 0)
                {
                    transaction.overrideEntity(newVault.passwordStoreState.passwordStoreStateID, partialPasswordStoreState, () => environment.repositories.passwordStoreStates);
                }
            }
        }

        if (newVault.valueStoreState && newVault.valueStoreState.valueStoreStateID)
        {
            if (currentVault.valueStoreState?.entityState == EntityState.Updated)
            {
                if (!await (environment.repositories.valueStoreStates.mergeStates(key, currentVault.valueStoreState.valueStoreStateID,
                    newVault.valueStoreState, changeTrackings, transaction)))
                {
                    return;
                }

                needsToRePushData = true;
            }
            else 
            {
                const partialValueStoreState: DeepPartial<ValueStoreState> = StoreState.getUpdatedPropertiesFromObject(newVault.valueStoreState);
                if (Object.keys(partialValueStoreState).length > 0)
                {
                    transaction.overrideEntity(newVault.valueStoreState.valueStoreStateID, partialValueStoreState, () => environment.repositories.valueStoreStates);
                }
            }
        }

        if (newVault.filterStoreState && newVault.filterStoreState.filterStoreStateID)
        {
            if (currentVault.filterStoreState?.entityState == EntityState.Updated)
            {
                if (!await (environment.repositories.filterStoreStates.mergeStates(key, currentVault.filterStoreState.filterStoreStateID,
                    newVault.filterStoreState, changeTrackings, transaction)))
                {
                    return;
                }

                needsToRePushData = true;
            }
            else 
            {
                const partialFilterStoreState: DeepPartial<FilterStoreState> = StoreState.getUpdatedPropertiesFromObject(newVault.filterStoreState);
                if (Object.keys(partialFilterStoreState).length > 0)
                {
                    transaction.overrideEntity(newVault.filterStoreState.filterStoreStateID, partialFilterStoreState, () => environment.repositories.filterStoreStates);
                }
            }
        }

        if (newVault.groupStoreState && newVault.groupStoreState.groupStoreStateID)
        {
            if (currentVault.groupStoreState?.entityState == EntityState.Updated)
            {
                if (!await (environment.repositories.groupStoreStates.mergeStates(key, currentVault.groupStoreState.groupStoreStateID,
                    newVault.groupStoreState, changeTrackings, transaction)))
                {
                    return;
                }

                needsToRePushData = true;
            }
            else 
            {
                const partialGroupStoreState: DeepPartial<GroupStoreState> = StoreState.getUpdatedPropertiesFromObject(newVault.groupStoreState);
                if (Object.keys(partialGroupStoreState).length > 0)
                {
                    transaction.overrideEntity(newVault.groupStoreState.groupStoreStateID, partialGroupStoreState, () => environment.repositories.groupStoreStates);
                }
            }
        }

        return needsToRePushData;
    }

    public async getStoreStates(masterKey: string, userVaultID: number, storeStatesToRetrieve: CondensedVaultData): Promise<TypedMethodResponse<DeepPartial<CondensedVaultData> | undefined>>
    {
        return await safetifyMethod(this, internalGetStoreStates);

        async function internalGetStoreStates(this: VaultRepository): Promise<TypedMethodResponse<DeepPartial<CondensedVaultData>>>
        {
            const statesToDecrypt = [];
            if (storeStatesToRetrieve.vaultStoreState)
            {
                statesToDecrypt.push(nameof<Vault>("vaultStoreState"));
            }

            if (storeStatesToRetrieve.passwordStoreState)
            {
                statesToDecrypt.push(nameof<Vault>("passwordStoreState"));
            }

            if (storeStatesToRetrieve.valueStoreState)
            {
                statesToDecrypt.push(nameof<Vault>("valueStoreState"));
            }

            if (storeStatesToRetrieve.filterStoreState)
            {
                statesToDecrypt.push(nameof<Vault>("filterStoreState"));
            }

            if (storeStatesToRetrieve.groupStoreState)
            {
                statesToDecrypt.push(nameof<Vault>("groupStoreState"));
            }

            const condensedVaults = await environment.repositories.userVaults.getVerifiedAndDecryt(masterKey, statesToDecrypt, [userVaultID]);
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

    public async syncVaults(masterKey: string): Promise<TypedMethodResponse<boolean | undefined>>
    {
        return await safetifyMethod(this, internalSyncVaults);

        async function internalSyncVaults(this: VaultRepository): Promise<TypedMethodResponse<boolean>>
        {
            const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
            if (!currentUser)
            {
                return TypedMethodResponse.fail(errorCodes.NO_USER);
            }

            const signatures = await getUserDataSignatures(masterKey, currentUser.email);
            const result = await vaulticServer.vault.syncVaults(signatures.signatures);

            if (!result.Success)
            {
                return TypedMethodResponse.fail();
            }

            // no changes
            if (!result.userDataPayload)
            {
                return TypedMethodResponse.success();
            }

            const success = await checkMergeMissingData(masterKey, currentUser.email, signatures.keys, signatures.signatures, result.userDataPayload);
            if (!success)
            {
                return TypedMethodResponse.fail();
            }

            return TypedMethodResponse.success();
        }
    }
}

const vaultRepository: VaultRepository = new VaultRepository();
export default vaultRepository;
export type VaultRepositoryType = typeof vaultRepository;