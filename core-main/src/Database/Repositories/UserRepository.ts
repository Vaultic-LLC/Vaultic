import { environment } from "../../Environment";
import { User } from "../Entities/User";
import { VaulticRepository } from "./VaulticRepository";
import { Repository } from "typeorm";
import Transaction from "../Transaction";
import vaulticServer from "../../Server/VaulticServer";
import { UserVault } from "../Entities/UserVault";
import { AppStoreState } from "../Entities/States/AppStoreState";
import { UserPreferencesStoreState } from "../Entities/States/UserPreferencesStoreState";
import { Vault } from "../Entities/Vault";
import { backupData } from "../../Helpers/RepositoryHelper";
import { StoreState } from "../Entities/States/StoreState";
import { safetifyMethod } from "../../Helpers/RepositoryHelper";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import errorCodes from "@vaultic/shared/Types/ErrorCodes";
import { EntityState, getVaultType, UserData } from "@vaultic/shared/Types/Entities";
import { DeepPartial, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { IUserRepository } from "../../Types/Repositories";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { ChangeTracking } from "../Entities/ChangeTracking";
import { SimplifiedPasswordStore } from "@vaultic/shared/Types/Stores";
import { Field } from "@vaultic/shared/Types/Fields";
import { ServerPermissions } from "@vaultic/shared/Types/ClientServerTypes";

class UserRepository extends VaulticRepository<User> implements IUserRepository
{
    protected getRepository(): Repository<User> | undefined
    {
        return environment.databaseDataSouce.getRepository(User);
    }

    private async setMasterKey(masterKey: string, user: User | DeepPartial<User>, encrypt: boolean): Promise<boolean>
    {
        const salt = environment.utilities.generator.randomValue(40);
        const hash = await environment.utilities.hash.hash(masterKey, salt);

        if (encrypt)
        {
            const encryptedSalt = await environment.utilities.crypt.encrypt(masterKey, salt);
            if (!encryptedSalt.success)
            {
                return false;
            }

            const encryptedHash = await environment.utilities.crypt.encrypt(masterKey, hash);
            if (!encryptedHash.success)
            {
                return false;
            }

            user.masterKeyHash = encryptedHash.value!;
            user.masterKeySalt = encryptedSalt.value!;

            return true;
        }

        user.masterKeyHash = hash;
        user.masterKeySalt = salt;

        return true;
    }

    // Should only be called when we don't really care about data integrity, like in LogRepository
    public async getCurrentUser()
    {
        if (!environment.cache.currentUserID)
        {
            return null;
        }

        return this.retrieveReactive((repository) => repository.findOneBy({
            userID: environment.cache.currentUserID
        }));
    }

    public async getVerifiedCurrentUser(masterKey: string)
    {
        const user = await this.getCurrentUser();
        if (user && await user.verify(masterKey))
        {
            return user;
        }

        return null;
    }

    public async findByEmail(masterKey: string, email: string) 
    {
        const user = await this.retrieveReactive((repository) => repository.findOneBy({
            email: email
        }));

        if (user && await user.verify(masterKey))
        {
            return user;
        }

        return null;
    }

    // This can't verify since we can't verify other users 
    private async getLastUsedUser()
    {
        const user = await this.retrieveReactive((repository) => repository.findOneBy({
            lastUsed: true
        }));

        return user;
    }

    public async getLastUsedUserEmail(): Promise<string | null>
    {
        const lastUsedUser = await this.getLastUsedUser();
        return lastUsedUser?.email ?? null;
    }

    public async getLastUsedUserPreferences(): Promise<string | null>
    {
        const lastUsedUser = await this.getLastUsedUser();
        return lastUsedUser?.userPreferencesStoreState?.state ?? null;
    }

    public async getValidMasterKey(): Promise<string | undefined>
    {
        if (!environment.cache.masterKey)
        {
            return undefined;
        }

        const response = await this.verifyUserMasterKey(environment.cache.masterKey);
        if (response.success && response.value)
        {
            return environment.cache.masterKey;
        }

        return undefined;
    }

    public async createUser(masterKey: string, email: string, publicKey: string, privateKey: string, transaction?: Transaction): Promise<TypedMethodResponse<boolean | undefined>>
    {
        return await safetifyMethod(this, internalCreateUser);

        async function internalCreateUser(this: UserRepository): Promise<TypedMethodResponse<boolean>>
        {
            const response = await vaulticServer.user.getUserIDs();
            if (!response.Success)
            {
                return TypedMethodResponse.fail(errorCodes.FAILED_TO_GET_USER_IDS, undefined, "Get User Ids");
            }

            const user = new User().makeReactive();
            user.userID = response.UserID!;
            user.email = email;
            user.lastUsed = true;
            user.publicKey = publicKey;
            user.privateKey = privateKey;
            user.userVaults = [];

            await this.setMasterKey(masterKey, user, false);

            const appStoreState = new AppStoreState().makeReactive();
            appStoreState.appStoreStateID = response.AppStoreStateID!;
            appStoreState.userID = response.UserID!;
            appStoreState.state = "{}";
            user.appStoreState = appStoreState;

            const userPreferencesStoreState = new UserPreferencesStoreState().makeReactive();
            userPreferencesStoreState.userPreferencesStoreStateID = response.UserPreferencesStoreStateID!;
            userPreferencesStoreState.userID = response.UserID!;
            userPreferencesStoreState.state = "{}"
            user.userPreferencesStoreState = userPreferencesStoreState;

            const vaults = await environment.repositories.vaults.createNewVault("Personal", false, [], []);
            if (!vaults)
            {
                return TypedMethodResponse.fail(errorCodes.FAILED_TO_CREATE_NEW_VAULT, undefined, "Create new Vault");
            }

            const userVault: UserVault = vaults[0];
            const vault: Vault = vaults[1];
            const vaultKey: string = vaults[2];

            const encryptedVaultKey = await environment.utilities.crypt.ECEncrypt(publicKey, vaultKey);
            if (!encryptedVaultKey.success)
            {
                return TypedMethodResponse.fail(errorCodes.EC_ENCRYPTION_FAILED);
            }

            vault.lastUsed = true;

            userVault.userID = user.userID;
            userVault.user = user;
            userVault.vaultKey = JSON.vaulticStringify({
                vaultKey: encryptedVaultKey.value.data,
                publicKey: encryptedVaultKey.value.publicKey
            });

            // Order matters here
            transaction = transaction ?? new Transaction();
            transaction.insertEntity(user, masterKey, () => this);
            transaction.insertEntity(user.appStoreState, masterKey, () => environment.repositories.appStoreStates);
            transaction.insertEntity(user.userPreferencesStoreState, "", () => environment.repositories.userPreferencesStoreStates);

            transaction.insertEntity(vault, vaultKey, () => environment.repositories.vaults);
            transaction.insertEntity(vault.vaultStoreState, vaultKey, () => environment.repositories.vaultStoreStates);
            transaction.insertEntity(vault.passwordStoreState, vaultKey, () => environment.repositories.passwordStoreStates);
            transaction.insertEntity(vault.valueStoreState, vaultKey, () => environment.repositories.valueStoreStates);
            transaction.insertEntity(vault.filterStoreState, vaultKey, () => environment.repositories.filterStoreStates);
            transaction.insertEntity(vault.groupStoreState, vaultKey, () => environment.repositories.groupStoreStates);

            transaction.insertEntity(userVault, masterKey, () => environment.repositories.userVaults);
            transaction.insertEntity(userVault.vaultPreferencesStoreState, "", () => environment.repositories.vaultPreferencesStoreStates);

            const lastUsedUser = await this.getLastUsedUser();
            if (lastUsedUser)
            {
                lastUsedUser.lastUsed = false;
                transaction.updateEntity(lastUsedUser, '', () => this);
            }

            const succeeded = await transaction.commit();
            if (!succeeded)
            {
                await vaulticServer.vault.failedToSaveVault(userVault.userOrganizationID, userVault.userVaultID);
                return TypedMethodResponse.transactionFail();
            }

            // set before backing up
            environment.cache.setCurrentUserID(user.userID);

            const backupResponse = await backupData(masterKey);
            if (!backupResponse)
            {
                return TypedMethodResponse.backupFail();
            }

            console.log('create user succeeded');
            return TypedMethodResponse.success();
        }
    }

    public async verifyUserMasterKey(masterKey: string, email?: string): Promise<TypedMethodResponse<boolean | undefined>>
    {
        return await safetifyMethod(this, internalVerifyUserMasterKey);

        async function internalVerifyUserMasterKey(this: UserRepository): Promise<TypedMethodResponse<boolean>>
        {
            let user: User | null = null;
            if (email)
            {
                // don't verify since that will cause an exception if the master key is wrong, which makes it impossible
                // to tell if the user doesn't exist or if they just didn't type the master key correctly
                user = await this.repository.findOneBy({ email: email });
            }
            else 
            {
                // this is ok to not verify since the masterKey hash and salt aren't included in the 
                // signature anyways, so verifying won't actually do anything if they were tampered with
                user = await this.getCurrentUser();
            }

            if (!user)
            {
                return TypedMethodResponse.fail(errorCodes.NO_USER);
            }

            const decryptedHashResponse = await environment.utilities.crypt.decrypt(masterKey, user.masterKeyHash);
            if (!decryptedHashResponse.success)
            {
                return TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED, undefined, "Hash");
            }

            const decryptedSaltResponse = await environment.utilities.crypt.decrypt(masterKey, user.masterKeySalt);
            if (!decryptedSaltResponse.success)
            {
                return TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED, undefined, "Salt");
            }

            const hash = await environment.utilities.hash.hash(masterKey, decryptedSaltResponse.value!);
            return TypedMethodResponse.success(environment.utilities.hash.compareHashes(decryptedHashResponse.value!, hash));
        }
    }

    public async setCurrentUser(masterKey: string, email: string): Promise<TypedMethodResponse<undefined>>
    {
        return await safetifyMethod(this, internalSetCurrentUser);

        async function internalSetCurrentUser(this: UserRepository): Promise<TypedMethodResponse<undefined>>
        {
            // don't allow setting a current user while one is already set. This would cause issues
            // for the first user
            if (environment.cache.currentUserID != undefined)
            {
                return TypedMethodResponse.fail(undefined, "setCurrentUser", "Current User already set");
            }

            const user = await this.findByEmail(masterKey, email);
            if (!user)
            {
                return TypedMethodResponse.fail(errorCodes.NO_USER);
            }

            const transaction = new Transaction();
            const lastCurrentUser = await this.getLastUsedUser();

            if (lastCurrentUser)
            {
                lastCurrentUser.lastUsed = false;
                transaction.updateEntity(lastCurrentUser, masterKey, () => this);
            }

            user.lastUsed = true;
            transaction.updateEntity(user, masterKey, () => this);
            const succeeded = await transaction.commit();
            if (!succeeded)
            {
                return TypedMethodResponse.transactionFail();
            }

            environment.cache.setCurrentUserID(user.userID);
            await environment.repositories.logs.clearOldLogs(email);

            // Make sure the users masterKey hasn't been tampered with. If so, update it
            if (!(await this.verifyUserMasterKey(masterKey)).success)
            {
                await this.setMasterKey(masterKey, user, false);

                const masterKeyTransaction = new Transaction();
                masterKeyTransaction.updateEntity(user, masterKey, () => this);

                if (!masterKeyTransaction.commit())
                {
                    return TypedMethodResponse.fail();
                }
            }

            return TypedMethodResponse.success();
        }
    }

    public async getCurrentUserData(masterKey: string): Promise<TypedMethodResponse<string | undefined>>
    {
        return await safetifyMethod(this, internalGetCurrentUserData);

        async function internalGetCurrentUserData(this: UserRepository): Promise<TypedMethodResponse<string | undefined>>
        {
            const currentUser = await this.getVerifiedCurrentUser(masterKey);
            if (!currentUser)
            {
                return TypedMethodResponse.fail(errorCodes.NO_USER);
            }

            const decryptedAppStoreState = await environment.utilities.crypt.decrypt(masterKey, currentUser.appStoreState.state);
            if (!decryptedAppStoreState)
            {
                return TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED, undefined, "AppStoreState");
            }

            const userData: UserData =
            {
                success: false,
                appStoreState: decryptedAppStoreState.value!,
                userPreferencesStoreState: currentUser.userPreferencesStoreState.state,
                displayVaults: [],
                currentVault: undefined
            };

            const userVaults = await environment.repositories.userVaults.getVerifiedAndDecryt(masterKey,
                [nameof<Vault>("name"), nameof<Vault>("passwordStoreState")]);

            if (!userVaults || userVaults.length == 0)
            {
                return TypedMethodResponse.fail(undefined, undefined, "No UserVaults");
            }

            for (let i = 0; i < userVaults.length; i++)
            {
                // we only want to set our last used vault for our vaults, not ones another user 
                // may have accessed
                if (userVaults[i].lastUsed && userVaults[i].isOwner)
                {
                    if (!(await setCurrentVault(userVaults[i].userVaultID, false)))
                    {
                        return TypedMethodResponse.fail(undefined, undefined, "Failed To Set Current Vault");
                    }
                }

                userData.displayVaults!.push({
                    userOrganizationID: userVaults[i].userOrganizationID,
                    userVaultID: userVaults[i].userVaultID,
                    vaultID: userVaults[i].vaultID,
                    name: userVaults[i].name,
                    shared: userVaults[i].shared,
                    isOwner: userVaults[i].isOwner,
                    isReadOnly: userVaults[i].isReadOnly,
                    isArchived: userVaults[i].isArchived,
                    lastUsed: userVaults[i].lastUsed,
                    type: getVaultType(userVaults[i]),
                    passwordsByDomain: (JSON.vaulticParse(userVaults[i].passwordStoreState) as SimplifiedPasswordStore).passwordsByDomain ?? new Field(new Map())
                });
            }

            if (!userData.currentVault)
            {
                if (!(await setCurrentVault(userData.displayVaults![0].userVaultID, true)))
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed to Set Backup Current Vault");
                }

                userData.displayVaults![0].lastUsed = true;
            }

            userData.success = true;
            return TypedMethodResponse.success(JSON.vaulticStringify(userData));

            // TODO: why is this needed? what does retrieving the vault again give that we don't already have from the first time?
            async function setCurrentVault(id: number, setAsLastUsed: boolean)
            {
                const userVault = await environment.repositories.userVaults.getVerifiedAndDecryt(masterKey, undefined, [id]);
                if (!userVault || userVault.length == 0)
                {
                    return false;
                }

                if (setAsLastUsed)
                {
                    if (!(await environment.repositories.vaults.setLastUsedVault(currentUser!, userVault[0].userVaultID)))
                    {
                        return false;
                    }
                }

                userData.currentVault = userVault[0];
                return true;
            }
        }
    }

    public async saveUser(masterKey: string, newData: string, currentData: string): Promise<TypedMethodResponse<boolean | undefined>>
    {
        return await safetifyMethod(this, internalSaveUser);

        async function internalSaveUser(this: UserRepository): Promise<TypedMethodResponse<boolean>>
        {
            let user: User | null;

            // the masterKey is "" when updating userPreferences. This isn't a concern since its the only thing that is updated
            // when this happens.
            if (masterKey)
            {
                user = await this.getVerifiedCurrentUser(masterKey);
            }
            else 
            {
                user = await this.getCurrentUser();
            }

            if (!user)
            {
                return TypedMethodResponse.fail(errorCodes.NO_USER);
            }

            const newUser: UserData = JSON.vaulticParse(newData);
            const transaction = new Transaction();

            let parsedCurrentData: UserData | undefined = undefined;
            if (newUser.appStoreState || newUser.userPreferencesStoreState)
            {
                parsedCurrentData = JSON.vaulticParse(currentData);
            }

            if (newUser.appStoreState)
            {
                const currentAppStoreState = JSON.vaulticParse(parsedCurrentData.appStoreState);
                const state = environment.repositories.changeTrackings.trackStateDifferences(user.userID, masterKey, JSON.vaulticParse(newUser.appStoreState), currentAppStoreState, transaction);

                if (!await (environment.repositories.appStoreStates.updateState(
                    user.appStoreState.appStoreStateID, masterKey, state, transaction)))
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed To Update AppStoreState");
                }
            }

            if (newUser.userPreferencesStoreState)
            {
                const currentUserPreferences = JSON.vaulticParse(parsedCurrentData.userPreferencesStoreState);
                const state = environment.repositories.changeTrackings.trackStateDifferences(user.userID, "", JSON.vaulticParse(newUser.userPreferencesStoreState), currentUserPreferences, transaction);

                if (!await (environment.repositories.userPreferencesStoreStates.updateState(
                    user.userPreferencesStoreState.userPreferencesStoreStateID, "", state, transaction)))
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed To Update UserPreferencesStoreState");
                }
            }

            const saved = await transaction.commit();
            if (!saved)
            {
                return TypedMethodResponse.transactionFail();
            }

            return TypedMethodResponse.success(true);
        }
    }

    public async getEntityThatNeedsToBeBackedUp(masterKey: string): Promise<TypedMethodResponse<DeepPartial<User> | undefined>>
    {
        const currentUser = await this.getVerifiedCurrentUser(masterKey);
        if (!currentUser)
        {
            return TypedMethodResponse.fail();
        }

        const response = await this.retrieveAndVerify(masterKey, getUsers);
        if (!response[0])
        {
            return TypedMethodResponse.fail();
        }

        if (!response[1])
        {
            return TypedMethodResponse.success();
        }

        const user = response[1];
        const userDataToBackup: Partial<User> = {};

        if (user.propertiesToSync.length > 0)
        {
            Object.assign(userDataToBackup, user.getBackup());
        }
        else 
        {
            // make sure we always add the userID, even if just store states are being updated
            userDataToBackup.userID = user.userID;
        }

        if (user.appStoreState.propertiesToSync.length > 0)
        {
            userDataToBackup.appStoreState = user.appStoreState.getBackup() as AppStoreState;
        }

        if (user.userPreferencesStoreState.propertiesToSync.length > 0)
        {
            userDataToBackup.userPreferencesStoreState = user.userPreferencesStoreState.getBackup() as UserPreferencesStoreState;
        }

        return TypedMethodResponse.success(userDataToBackup);

        function getUsers(repository: Repository<User>): Promise<User | null>
        {
            return repository
                .createQueryBuilder("users")
                .leftJoinAndSelect("users.appStoreState", "appStoreState")
                .leftJoinAndSelect("users.userPreferencesStoreState", "userPreferencesStoreState")
                .where("users.userID = :userID", { userID: currentUser?.userID })
                .andWhere(`(
                        users.entityState != :entityState OR 
                        appStoreState.entityState != :entityState OR 
                        userPreferencesStoreState.entityState != :entityState
                    )`,
                    { entityState: EntityState.Unchanged })
                .getOne();
        }
    }

    public async postBackupEntityUpdates(key: string, entity: DeepPartial<User>, transaction: Transaction)
    {
        const currentUser = await this.getVerifiedCurrentUser(key);
        if (!currentUser || !entity.userID || entity.userID != currentUser.userID)
        {
            return false;
        }

        transaction.resetTracking(currentUser, "", () => this)

        // TODO: what to do if updating previousSignatures on store states fails? The server has been updated
        // so the client will no longer be able to update. Detect and force update data from server? Should be handled
        // when merging data? Should just be able to fix during merge. Nothing will actually be different, so the merge
        // will just basically end up taking the servers previous signature
        if (entity.appStoreState)
        {
            transaction.resetTracking(currentUser.appStoreState, key, () => environment.repositories.appStoreStates);
        }

        if (entity.userPreferencesStoreState)
        {
            transaction.resetTracking(currentUser.userPreferencesStoreState, "", () => environment.repositories.userPreferencesStoreStates);
        }

        return true;
    }

    public async addFromServer(masterKey: string, user: DeepPartial<User>, transaction: Transaction): Promise<boolean>
    {
        if (!User.isValid(user))
        {
            return false;
        }

        user.lastUsed = false;
        if (!await this.setMasterKey(masterKey, user, true))
        {
            return false;
        }

        console.log(`User: \n${JSON.stringify(user)}`)
        transaction.insertExistingEntity(user, () => this);
        transaction.insertExistingEntity(user.appStoreState!, () => environment.repositories.appStoreStates);
        transaction.insertExistingEntity(user.userPreferencesStoreState!, () => environment.repositories.userPreferencesStoreStates);

        return true;
    }

    public async updateFromServer(masterKey: string, currentUser: DeepPartial<User>, newUser: DeepPartial<User>, changeTrackings: Dictionary<ChangeTracking>, transaction: Transaction)
    {
        if (!newUser.userID)
        {
            return;
        }

        const partialUser: DeepPartial<User> = {};
        let updatedUser = false;
        let needsToRePushData = false;

        if (newUser.email)
        {
            partialUser[nameof<User>("email")] = newUser.email;
            updatedUser = true;
        }

        if (newUser.publicKey)
        {
            partialUser[nameof<User>("publicKey")] = newUser.publicKey;
            updatedUser = true;
        }

        if (newUser.privateKey)
        {
            partialUser[nameof<User>("privateKey")] = newUser.privateKey;
            updatedUser = true;
        }

        if (newUser.signatureSecret)
        {
            partialUser[nameof<User>("signatureSecret")] = newUser.signatureSecret;
            updatedUser = true;
        }

        if (newUser.currentSignature)
        {
            partialUser[nameof<User>("currentSignature")] = newUser.currentSignature;
            updatedUser = true;
        }

        if (updatedUser)
        {
            transaction.overrideEntity(newUser.userID, partialUser, () => this);
        }

        if (newUser.appStoreState && newUser.appStoreState.appStoreStateID)
        {
            if (currentUser?.appStoreState?.entityState == EntityState.Updated)
            {
                if (!await (environment.repositories.appStoreStates.mergeStates(masterKey, currentUser.appStoreState.appStoreStateID, newUser.appStoreState,
                    changeTrackings, transaction)))
                {
                    return;
                }

                needsToRePushData = true;
            }
            else
            {
                const partialAppStoreState: Partial<AppStoreState> = StoreState.getUpdatedPropertiesFromObject(newUser.appStoreState);
                if (Object.keys(partialAppStoreState).length > 0)
                {
                    transaction.overrideEntity(newUser.appStoreState.appStoreStateID, partialAppStoreState, () => environment.repositories.appStoreStates);
                }
            }
        }

        if (newUser.userPreferencesStoreState && newUser.userPreferencesStoreState.userPreferencesStoreStateID)
        {
            if (currentUser?.userPreferencesStoreState?.entityState == EntityState.Updated)
            {
                if (!await (environment.repositories.appStoreStates.mergeStates("", currentUser.appStoreState.appStoreStateID, newUser.appStoreState,
                    changeTrackings, transaction, false)))
                {
                    return;
                }

                needsToRePushData = true;
            }
            else 
            {
                const partialUserPreferencesStoreState: Partial<UserPreferencesStoreState> = StoreState.getUpdatedPropertiesFromObject(newUser.userPreferencesStoreState);
                if (Object.keys(partialUserPreferencesStoreState).length > 0)
                {
                    transaction.overrideEntity(
                        newUser.userPreferencesStoreState.userPreferencesStoreStateID,
                        partialUserPreferencesStoreState,
                        () => environment.repositories.userPreferencesStoreStates);
                }
            }
        }

        return needsToRePushData;
    }

    public async getStoreStates(masterKey: string, storeStatesToRetrieve: UserData): Promise<TypedMethodResponse<DeepPartial<UserData> | undefined>>
    {
        return await safetifyMethod(this, internalGetStoreStates);

        async function internalGetStoreStates(this: UserRepository): Promise<TypedMethodResponse<DeepPartial<UserData>>>
        {
            let currentUser: User | null;

            // the masterKey is "" when updating userPreferences. This isn't a concern since its the only thing that is updated
            // when this happens.
            if (masterKey)
            {
                currentUser = await this.getVerifiedCurrentUser(masterKey);
            }
            else 
            {
                currentUser = await this.getCurrentUser();
            }

            if (!currentUser)
            {
                return TypedMethodResponse.fail(errorCodes.NO_USER);
            }

            const userData: DeepPartial<UserData> = {};
            if (masterKey && storeStatesToRetrieve.appStoreState)
            {
                const decryptedAppStoreState = await environment.utilities.crypt.decrypt(masterKey, currentUser.appStoreState.state);
                if (!decryptedAppStoreState)
                {
                    return TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED, undefined, "AppStoreState");
                }

                userData.appStoreState = decryptedAppStoreState.value;
            }

            if (storeStatesToRetrieve.userPreferencesStoreState)
            {
                userData.userPreferencesStoreState = currentUser.userPreferencesStoreState.state;
            }

            return TypedMethodResponse.success(userData);
        }
    }
}

const userRepository: UserRepository = new UserRepository();
export default userRepository;
export type UserRepositoryType = typeof userRepository;