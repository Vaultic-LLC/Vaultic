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
import { EntityState, getVaultType, IUser, UserData } from "@vaultic/shared/Types/Entities";
import { DeepPartial, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { IUserRepository } from "../../Types/Repositories";
import { PathChange, SimplifiedPasswordStore, StoreStateChangeType, StoreType } from "@vaultic/shared/Types/Stores";
import { Algorithm, VaulticKey } from "@vaultic/shared/Types/Keys";
import { VerifyUserMasterKeyResponse } from "@vaultic/shared/Types/Repositories";
import { ChangeTracking } from "../Entities/ChangeTracking";
import { ClientChange, ClientChangeTrackingType, ClientUserChangeTrackings } from "@vaultic/shared/Types/ClientServerTypes";
import { getObjectFromPath, PropertyManagerConstructor } from "@vaultic/shared/Utilities/PropertyManagers";

class UserRepository extends VaulticRepository<User> implements IUserRepository
{
    protected getRepository(): Repository<User> | undefined
    {
        return environment.databaseDataSouce.getRepository(User);
    }

    private async setMasterKey(masterKey: string, user: User | DeepPartial<User>, encrypt: boolean): Promise<boolean>
    {
        const salt = environment.utilities.crypt.randomStrongValue(40);

        // TODO: switch to Argon2id
        const hash = await environment.utilities.hash.hash(Algorithm.SHA_256, masterKey, salt);
        if (!hash.success)
        {
            return false;
        }

        if (encrypt)
        {
            const encryptedSalt = await environment.utilities.crypt.symmetricEncrypt(masterKey, salt);
            if (!encryptedSalt.success)
            {
                return false;
            }

            const encryptedHash = await environment.utilities.crypt.symmetricEncrypt(masterKey, hash.value);
            if (!encryptedHash.success)
            {
                return false;
            }

            user.masterKeyHash = encryptedHash.value!;
            user.masterKeySalt = encryptedSalt.value!;

            return true;
        }

        user.masterKeyHash = hash.value;
        user.masterKeySalt = salt;

        return true;
    }

    // Should only be called when we don't really care about data integrity, like in LogRepository
    public async getCurrentUser()
    {
        if (!environment.cache.currentUser?.userID)
        {
            return null;
        }

        return this.retrieveReactive((repository) => repository.findOneBy({
            userID: environment.cache.currentUser.userID
        }));
    }

    public async getVerifiedCurrentUser(masterKey: string, alreadyVaulticKey: boolean = true)
    {
        const user = await this.getCurrentUser();
        if (!user)
        {
            return null;
        }

        let masterKeyToUse = masterKey;
        if (!alreadyVaulticKey)
        {
            const vaulticKey: VaulticKey =
            {
                algorithm: user.masterKeyEncryptionAlgorithm,
                key: masterKey
            };

            masterKeyToUse = JSON.vaulticStringify(vaulticKey);
        }

        if (await user.verify(masterKeyToUse))
        {
            return user;
        }

        return null;
    }

    public async findByEmail(masterKey: string, email: string, alreadyVaulticKey: boolean = true) 
    {
        const user = await this.retrieveReactive((repository) => repository.findOneBy({
            email: email
        }));

        if (!user)
        {
            return null;
        }

        let masterKeyToUse = masterKey;
        if (!alreadyVaulticKey)
        {
            const vaulticKey: VaulticKey =
            {
                algorithm: user.masterKeyEncryptionAlgorithm,
                key: masterKey
            };

            masterKeyToUse = JSON.vaulticStringify(vaulticKey);
        }

        if (await user.verify(masterKeyToUse))
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

    public async getLastUsedUserInfo(): Promise<Partial<IUser> | null>
    {
        const lastUsedUser = await this.getLastUsedUser();
        if (!lastUsedUser)
        {
            return null;
        }

        return {
            email: lastUsedUser.email,
            firstName: lastUsedUser.firstName,
            lastName: lastUsedUser.lastName
        }
    }

    public async getLastUsedUserPreferences(): Promise<string | null>
    {
        const lastUsedUser = await this.getLastUsedUser();
        if (!lastUsedUser?.userPreferencesStoreState?.state)
        {
            return null;
        }

        const result = await StoreState.getUsableState('', lastUsedUser.userPreferencesStoreState.state);
        if (!result.success)
        {
            return null;
        }

        return result.value;
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

    public async createUser(masterKey: string, email: string, firstName: string, lastName: string, transaction?: Transaction): Promise<TypedMethodResponse<boolean | undefined>>
    {
        return await safetifyMethod(this, internalCreateUser);

        async function internalCreateUser(this: UserRepository): Promise<TypedMethodResponse<boolean>>
        {
            const response = await vaulticServer.user.getUserIDs();
            if (!response.Success)
            {
                return TypedMethodResponse.fail(errorCodes.FAILED_TO_GET_USER_IDS, undefined, "Get User Ids");
            }

            const sigKeys = environment.utilities.crypt.generatePublicPrivateKeys(Algorithm.ML_DSA_87);
            const encKeys = environment.utilities.crypt.generatePublicPrivateKeys(Algorithm.ML_KEM_1024);

            const user = new User().makeReactive();
            user.userID = response.UserID!;
            user.email = email;
            user.firstName = firstName;
            user.lastName = lastName;
            user.lastUsed = true;
            user.masterKeyEncryptionAlgorithm = Algorithm.XCHACHA20_POLY1305;
            user.publicSigningKey = sigKeys.public;
            user.privateSigningKey = sigKeys.private;
            user.publicEncryptingKey = encKeys.public;
            user.privateEncryptingKey = encKeys.private;
            user.lastLoadedChangeVersion = 0;
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

            const vaults = await environment.repositories.vaults.createNewVault(masterKey, "Personal", false);
            if (!vaults)
            {
                return TypedMethodResponse.fail(errorCodes.FAILED_TO_CREATE_NEW_VAULT, undefined, "Create new Vault");
            }

            const userVault: UserVault = vaults[0];
            const vault: Vault = vaults[1];

            vault.lastUsed = true;

            userVault.userID = user.userID;
            userVault.user = user;

            // Order matters here
            transaction = transaction ?? new Transaction();
            transaction.insertEntity(user, masterKey, () => this);
            transaction.insertEntity(user.appStoreState, masterKey, () => environment.repositories.appStoreStates);
            transaction.insertEntity(user.userPreferencesStoreState, "", () => environment.repositories.userPreferencesStoreStates);

            transaction.insertEntity(vault, userVault.vaultKey, () => environment.repositories.vaults);
            transaction.insertEntity(vault.vaultStoreState, userVault.vaultKey, () => environment.repositories.vaultStoreStates);
            transaction.insertEntity(vault.passwordStoreState, userVault.vaultKey, () => environment.repositories.passwordStoreStates);
            transaction.insertEntity(vault.valueStoreState, userVault.vaultKey, () => environment.repositories.valueStoreStates);
            transaction.insertEntity(vault.filterStoreState, userVault.vaultKey, () => environment.repositories.filterStoreStates);
            transaction.insertEntity(vault.groupStoreState, userVault.vaultKey, () => environment.repositories.groupStoreStates);

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
            environment.cache.setCurrentUser(user);

            const backupResponse = await backupData(masterKey);
            if (!backupResponse)
            {
                return TypedMethodResponse.backupFail();
            }

            return TypedMethodResponse.success();
        }
    }

    public async verifyUserMasterKey(masterKey: string, email?: string, isVaulticKey: boolean = true): Promise<TypedMethodResponse<VerifyUserMasterKeyResponse | undefined>>
    {
        return await safetifyMethod(this, internalVerifyUserMasterKey);

        async function internalVerifyUserMasterKey(this: UserRepository): Promise<TypedMethodResponse<VerifyUserMasterKeyResponse>>
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

            let keyToUse = masterKey;
            if (!isVaulticKey)
            {
                const vaulticKey: VaulticKey =
                {
                    algorithm: user.masterKeyEncryptionAlgorithm,
                    key: masterKey
                };

                keyToUse = JSON.vaulticStringify(vaulticKey);
            }

            const decryptedHashResponse = await environment.utilities.crypt.symmetricDecrypt(keyToUse, user.masterKeyHash);
            if (!decryptedHashResponse.success)
            {
                return TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED, undefined, "Hash");
            }

            const decryptedSaltResponse = await environment.utilities.crypt.symmetricDecrypt(keyToUse, user.masterKeySalt);
            if (!decryptedSaltResponse.success)
            {
                return TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED, undefined, "Salt");
            }

            // TODO: switch to Argon2id
            const hash = await environment.utilities.hash.hash(Algorithm.SHA_256, keyToUse, decryptedSaltResponse.value!);
            if (!hash.success)
            {
                return TypedMethodResponse.fail();
            }

            const response: VerifyUserMasterKeyResponse =
            {
                isValid: environment.utilities.hash.compareHashes(decryptedHashResponse.value!, hash.value),
                keyAlgorithm: user.masterKeyEncryptionAlgorithm
            };

            return TypedMethodResponse.success(response);
        }
    }

    public async setCurrentUser(masterKey: string, email: string): Promise<TypedMethodResponse<undefined>>
    {
        return await safetifyMethod(this, internalSetCurrentUser);

        async function internalSetCurrentUser(this: UserRepository): Promise<TypedMethodResponse<undefined>>
        {
            // don't allow setting a current user while one is already set. This would cause issues
            // for the first user
            if (environment.cache.currentUser != undefined)
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

            environment.cache.setCurrentUser(user);
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
            try
            {
                const currentUser = await this.getVerifiedCurrentUser(masterKey);
                if (!currentUser)
                {
                    return TypedMethodResponse.fail(errorCodes.NO_USER);
                }

                const decryptedAppStoreState = await StoreState.getUsableState(masterKey, currentUser.appStoreState.state);
                if (!decryptedAppStoreState)
                {
                    return TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED, undefined, "AppStoreState");
                }

                const usableUserPreferencesState = await StoreState.getUsableState('', currentUser.userPreferencesStoreState.state);
                if (!usableUserPreferencesState.success)
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Unable to get user preferences");
                }

                const userData: UserData =
                {
                    success: false,
                    userInfo:
                    {
                        email: currentUser.email,
                        firstName: currentUser.firstName,
                        lastName: currentUser.lastName
                    },
                    appStoreState: decryptedAppStoreState.value!,
                    userPreferencesStoreState: usableUserPreferencesState.value,
                    displayVaults: [],
                    currentVault: undefined
                };

                const userVaults = await environment.repositories.userVaults.getVerifiedAndDecryt(masterKey, [nameof<Vault>("name")], ["passwordStoreState"]);
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
                        passwordsByDomain: (JSON.vaulticParse(userVaults[i].passwordStoreState) as SimplifiedPasswordStore).o ?? {}
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
                    const userVault = await environment.repositories.userVaults.getVerifiedAndDecryt(masterKey, undefined, undefined, [id], true);
                    if (!userVault || userVault.length == 0)
                    {
                        return false;
                    }

                    if (setAsLastUsed)
                    {
                        if (!(await environment.repositories.vaults.setLastUsedVault(currentUser!.userID, userVault[0].userVaultID)))
                        {
                            return false;
                        }
                    }

                    userData.currentVault = userVault[0];
                    return true;
                }
            }
            catch (e)
            {
                console.log(e);
            }
        }
    }

    public async saveUser(masterKey: string, changes: string): Promise<TypedMethodResponse<boolean | undefined>>
    {
        return await safetifyMethod(this, internalSaveUser);

        async function internalSaveUser(this: UserRepository): Promise<TypedMethodResponse<boolean>>
        {
            try
            {
                if (!environment.cache.currentUser?.userID)
                {
                    return TypedMethodResponse.fail(errorCodes.NO_USER);
                }

                const transaction = new Transaction();
                ChangeTracking.creteAndInsert(masterKey, ClientChangeTrackingType.User, changes, transaction, environment.cache.currentUser.userID);

                const saved = await transaction.commit();
                if (!saved)
                {
                    return TypedMethodResponse.transactionFail();
                }

                return TypedMethodResponse.success(true);
            }
            catch (e)
            {
                console.log(e);
            }
        }
    }

    public async getEntityThatNeedsToBeBackedUp(masterKey: string): Promise<TypedMethodResponse<DeepPartial<User> | undefined>>
    {
        if (!environment.cache.currentUser?.userID)
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
                .where("users.userID = :userID", { userID: environment.cache.currentUser.userID })
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

        transaction.insertExistingEntity(user, () => this);
        transaction.insertExistingEntity(user.appStoreState!, () => environment.repositories.appStoreStates);
        transaction.insertExistingEntity(user.userPreferencesStoreState!, () => environment.repositories.userPreferencesStoreStates);

        return true;
    }

    public async updateFromServer(
        masterKey: string,
        currentUser: User,
        newUser: DeepPartial<User>,
        serverChanges: ClientUserChangeTrackings,
        localChanges: ChangeTracking[],
        existingUserChanges: ClientUserChangeTrackings | undefined,
        transaction: Transaction)
    {
        const partialUser: DeepPartial<User> = {};
        let updatedUser = false;

        if (newUser.email)
        {
            partialUser[nameof<User>("email")] = newUser.email;
            updatedUser = true;
        }

        if (newUser.masterKeyEncryptionAlgorithm)
        {
            partialUser[nameof<User>("masterKeyEncryptionAlgorithm")] = newUser.masterKeyEncryptionAlgorithm;
            updatedUser = true;
        }

        if (newUser.publicSigningKey)
        {
            partialUser[nameof<User>("publicSigningKey")] = newUser.publicSigningKey;
            updatedUser = true;
        }

        if (newUser.privateSigningKey)
        {
            partialUser[nameof<User>("privateSigningKey")] = newUser.privateSigningKey;
            updatedUser = true;
        }

        if (newUser.publicEncryptingKey)
        {
            partialUser[nameof<User>("publicEncryptingKey")] = newUser.publicEncryptingKey;
            updatedUser = true;
        }

        if (newUser.privateEncryptingKey)
        {
            partialUser[nameof<User>("privateEncryptingKey")] = newUser.privateEncryptingKey;
            updatedUser = true;
        }

        if (newUser.currentSignature)
        {
            partialUser[nameof<User>("currentSignature")] = newUser.currentSignature;
            updatedUser = true;
        }

        if (newUser.lastLoadedChangeVersion)
        {
            partialUser[nameof<User>("lastLoadedChangeVersion")] = newUser.lastLoadedChangeVersion;
            updatedUser = true;
        }

        if (updatedUser)
        {
            transaction.overrideEntity(newUser.userID, partialUser, () => this);
        }

        if (newUser.appStoreState && newUser.appStoreState.appStoreStateID)
        {
            const partialAppStoreState: Partial<AppStoreState> = StoreState.getUpdatedPropertiesFromObject(newUser.appStoreState);
            if (Object.keys(partialAppStoreState).length > 0)
            {
                transaction.overrideEntity(newUser.appStoreState.appStoreStateID, partialAppStoreState, () => environment.repositories.appStoreStates);
            }
        }

        if (newUser.userPreferencesStoreState && newUser.userPreferencesStoreState.userPreferencesStoreStateID)
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

        const seenServerChanges: Map<StoreType, Map<string, number>> = new Map();
        let lastLoadedVersion = currentUser.lastLoadedChangeVersion;

        let appStore: AppStoreState = undefined;
        let userPreferences: UserPreferencesStoreState = undefined;

        let appStoreState: any = undefined;
        let userPreferencesStoreState: any = undefined;

        if (serverChanges)
        {
            for (let i = 0; i < serverChanges.allChanges.length; i++)
            {
                lastLoadedVersion = serverChanges.allChanges[i].version;
                const parsedChanges: { [key in StoreType]: { [key: string]: PathChange[] } } = JSON.parse(serverChanges.allChanges[i].changes);

                if (parsedChanges[StoreType.App])
                {
                    if (!appStoreState)
                    {
                        const currentAppStoreState = await environment.repositories.appStoreStates.retrieveAndVerify(masterKey,
                            (repository) => repository.findOneBy({
                                userID: currentUser.userID
                            }));

                        if (!currentAppStoreState)
                        {
                            return;
                        }

                        appStore = currentAppStoreState[1].makeReactive();
                        appStoreState = JSON.parse(appStore.state);
                    }

                    mergeChanges(StoreType.App, appStoreState, parsedChanges[StoreType.App], serverChanges.allChanges[i].changeTime, false);
                }

                if (parsedChanges[StoreType.UserPreferences])
                {
                    if (!userPreferencesStoreState)
                    {
                        const currentUserPreferences = await environment.repositories.userPreferencesStoreStates.retrieveAndVerify(masterKey,
                            (repository) => repository.findOneBy({
                                userID: currentUser.userID
                            }));

                        if (!currentUserPreferences)
                        {
                            return;
                        }

                        userPreferences = currentUserPreferences[1].makeReactive();
                        userPreferencesStoreState = JSON.parse(userPreferences.state);
                    }

                    mergeChanges(StoreType.UserPreferences, userPreferencesStoreState, parsedChanges[StoreType.UserPreferences], serverChanges.allChanges[i].changeTime, false);
                }
            }
        }

        const clientUserChangesToPush: ClientUserChangeTrackings =
        {
            userID: currentUser.userID,
            lastLoadedChangeVersion: lastLoadedVersion,
            allChanges: []
        };

        let needsToRePushAppState = false;
        let needsToRePushUserPreferences = false;

        // We already applied these changes once but failed to backup because someone else backed up before we could.
        // We just need to check to see if they updated the same property as us and remove them if necessary
        if (existingUserChanges)
        {
            for (let i = 0; i < existingUserChanges.allChanges.length; i++)
            {
                const parsedChanges: { [key in StoreType]: { [key: string]: PathChange[] } } = JSON.parse(existingUserChanges.allChanges[i].changes);
                if (parsedChanges[StoreType.App])
                {
                    checkRemoveDuplicatesFromChanges(StoreType.App, parsedChanges[StoreType.App], existingUserChanges.allChanges[i].changeTime);
                }

                if (parsedChanges[StoreType.UserPreferences])
                {
                    checkRemoveDuplicatesFromChanges(StoreType.UserPreferences, parsedChanges[StoreType.UserPreferences], existingUserChanges.allChanges[i].changeTime);
                }

                clientUserChangesToPush.lastLoadedChangeVersion += 1;
                const clientChange: ClientChange =
                {
                    changes: JSON.stringify(parsedChanges),
                    changeTime: localChanges[i].changeTime,
                    version: clientUserChangesToPush.lastLoadedChangeVersion
                };

                clientUserChangesToPush.allChanges.push(clientChange);
            }
        }
        // First time calculating changes
        else 
        {
            for (let i = 0; i < localChanges.length; i++)
            {
                const parsedChanges: { [key in StoreType]: { [key: string]: PathChange[] } } = JSON.parse(localChanges[i].changes);
                if (parsedChanges[StoreType.App])
                {
                    if (!appStoreState)
                    {
                        const currentAppStoreState = await environment.repositories.appStoreStates.retrieveAndVerify(masterKey,
                            (repository) => repository.findOneBy({
                                userID: currentUser.userID
                            }));

                        if (!currentAppStoreState)
                        {
                            return;
                        }

                        appStore = currentAppStoreState[1].makeReactive();
                        appStoreState = JSON.parse(appStore.state);
                    }

                    mergeChanges(StoreType.App, appStoreState, parsedChanges[StoreType.App], localChanges[i].changeTime, true);
                    needsToRePushAppState = true;
                }

                if (parsedChanges[StoreType.UserPreferences])
                {
                    if (!userPreferencesStoreState)
                    {
                        const currentUserPreferences = await environment.repositories.userPreferencesStoreStates.retrieveAndVerify(masterKey,
                            (repository) => repository.findOneBy({
                                userID: currentUser.userID
                            }));

                        if (!currentUserPreferences)
                        {
                            return;
                        }

                        userPreferences = currentUserPreferences[1].makeReactive();
                        userPreferencesStoreState = JSON.parse(userPreferences.state);
                    }

                    mergeChanges(StoreType.UserPreferences, userPreferencesStoreState, parsedChanges[StoreType.UserPreferences], localChanges[i].changeTime, true);
                    needsToRePushUserPreferences = true;
                }

                clientUserChangesToPush.lastLoadedChangeVersion += 1;
                const clientChange: ClientChange =
                {
                    changes: JSON.stringify(parsedChanges),
                    changeTime: localChanges[i].changeTime,
                    version: clientUserChangesToPush.lastLoadedChangeVersion
                };

                clientUserChangesToPush.allChanges.push(clientChange);
            }

            if (appStore)
            {
                appStore.state = JSON.stringify(appStoreState);
                transaction.updateEntity(appStore, masterKey, () => environment.repositories.appStoreStates);
            }

            if (userPreferences)
            {
                userPreferences.state = JSON.stringify(userPreferencesStoreState);
                transaction.updateEntity(userPreferences, masterKey, () => environment.repositories.userPreferencesStoreStates);
            }

        }

        return { needsToRePushAppState, needsToRePushUserPreferences, clientUserChangesToPush };

        function mergeChanges(type: StoreType, current: any, pathChanges: { [key: string]: PathChange[] }, changeTime: number, forClient: boolean)
        {
            const paths = Object.keys(pathChanges);
            for (let i = 0; i < paths.length; i++)
            {
                const pathChange = pathChanges[paths[i]];
                for (let j = 0; j < pathChange.length; j++)
                {
                    // Most likely an array
                    if (!pathChange[j].p)
                    {
                        const obj = getObjectFromPath(paths[i], current);
                        if (!obj)
                        {
                            if (forClient)
                            {
                                // The object was delete on another device, don't include changes to it
                                delete pathChanges[paths[i]];
                            }
                        }

                        if (!Array.isArray(obj))
                        {
                            // don't know how to handle objects that don't have a property and aren't an array
                            continue;
                        }

                        switch (pathChange[j].t)
                        {
                            case StoreStateChangeType.Add:
                                obj.push(pathChange[j].v);
                                break;
                            case StoreStateChangeType.Delete:
                                obj.splice(0, 1);
                                break;
                        }
                    }
                    else
                    {
                        const path = `${paths[i]}.${pathChange[j].p}`;
                        if (forClient)
                        {
                            const serverChangeTime = seenServerChanges.get(type)?.get(path);
                            if (serverChangeTime && serverChangeTime > changeTime)
                            {
                                // TODO: test to make sure this works
                                // The value was updated on the server after we updted it locally, making the server value the newest.
                                // We don't want to apply this change, nor do we want any other devices to apply it
                                delete pathChanges[paths[i]];
                                continue;
                            }
                        }

                        const obj = getObjectFromPath(paths[i], current);
                        if (!obj)
                        {
                            if (forClient)
                            {
                                // The object was delete on another device, don't include changes to it
                                delete pathChanges[paths[i]];
                            }
                        }

                        const manager = PropertyManagerConstructor.getFor(obj);
                        switch (pathChange[j].t)
                        {
                            case StoreStateChangeType.Add:
                                manager.set(pathChange[j].p, pathChange[j].v, obj);
                                break;
                            case StoreStateChangeType.Update:
                                manager.set(pathChange[j].p, pathChange[j].v, obj);
                                updateSeen();
                                break;
                            case StoreStateChangeType.Delete:
                                manager.delete(pathChange[j].p, obj);
                                break;
                        }

                        function updateSeen()
                        {
                            if (!forClient)
                            {
                                if (!seenServerChanges.has(type))
                                {
                                    const seenChange = new Map();
                                    seenChange.set(path, changeTime);

                                    seenServerChanges.set(type, seenChange);
                                }
                                else
                                {
                                    seenServerChanges.get(type).set(path, changeTime)
                                }
                            }
                        }
                    }
                }
            }
        }

        function checkRemoveDuplicatesFromChanges(type: StoreType, pathChanges: { [key: string]: PathChange[] }, changeTime: number)
        {
            const paths = Object.keys(pathChanges);
            for (let i = 0; i < paths.length; i++)
            {
                const pathChange = pathChanges[paths[i]];
                for (let j = 0; j < pathChange.length; j++)
                {
                    // Most likely an array
                    if (!pathChange[j].p)
                    {
                        continue;
                    }
                    else
                    {
                        const path = `${paths[i]}.${pathChange[j].p}`;

                        const serverChangeTime = seenServerChanges.get(type)?.get(path);
                        if (serverChangeTime && serverChangeTime > changeTime)
                        {
                            // TODO: test to make sure this works
                            // The value was updated on the server after we updted it locally, making the server value the newest.
                            // We don't want to apply this change, nor do we want any other devices to apply it
                            delete pathChanges[path[i]];
                            continue;
                        }
                    }
                }
            }
        }
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
                const decryptedAppStoreState = await StoreState.getUsableState(masterKey, currentUser.appStoreState.state);
                if (!decryptedAppStoreState)
                {
                    return TypedMethodResponse.fail(undefined, undefined, "AppStoreState");
                }

                userData.appStoreState = decryptedAppStoreState.value;
            }

            if (storeStatesToRetrieve.userPreferencesStoreState)
            {
                const usableUserPreferencesState = await StoreState.getUsableState('', currentUser.userPreferencesStoreState.state);
                if (!usableUserPreferencesState.success)
                {
                    return TypedMethodResponse.fail(undefined, undefined, "UserPreferencesStoreState");
                }

                userData.userPreferencesStoreState = usableUserPreferencesState.value;
            }

            return TypedMethodResponse.success(userData);
        }
    }
}

const userRepository: UserRepository = new UserRepository();
export default userRepository;
export type UserRepositoryType = typeof userRepository;