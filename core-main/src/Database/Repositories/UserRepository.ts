import { environment } from "../../Environment";
import { User } from "../Entities/User";
import { CondensedVaultData, UserData } from "../../Types/Repositories";
import { VaulticRepository } from "./VaulticRepository";
import { EntitySchema, Repository } from "typeorm";
import Transaction from "../Transaction";
import vaulticServer from "../../Server/VaulticServer";
import { UserVault } from "../Entities/UserVault";
import { AppStoreState } from "../Entities/States/AppStoreState";
import { UserPreferencesStoreState } from "../Entities/States/UserPreferencesStoreState";
import { nameof } from "../../Helpers/TypeScriptHelper";
import { Vault } from "../Entities/Vault";
import { EntityState } from "../../Types/Properties";
import { backupData } from ".";
import { StoreState } from "../Entities/States/StoreState";

// TODO: move to cache
let currentUserID: number | undefined;

class UserRepository extends VaulticRepository<User>
{
    protected getRepository(): Repository<User> | undefined
    {
        return environment.databaseDataSouce.getRepository(User);
    }

    // TODO: this should verify the user as well
    public async getCurrentUser()
    {
        if (!currentUserID)
        {
            return undefined;
        }

        return this.retrieveReactive((repository) => repository.findOneBy({
            userID: currentUserID
        }));
    }

    public findByEmail(email: string) 
    {
        return this.retrieveReactive((repository) => repository.findOneBy({
            email: email
        }))
    }

    private getLastUsedUser()
    {
        return this.retrieveReactive((repository) => repository.findOneBy({
            lastUsed: true
        }));
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

    // TODO: better handle failed
    public async createUser(masterKey: string, email: string): Promise<boolean | string>
    {
        const response = await vaulticServer.user.getUserIDs();
        if (!response.Success)
        {
            return JSON.stringify(response);
        }

        const keys = await environment.utilities.generator.ECKeys();

        const salt = environment.utilities.generator.randomValue(40);
        const hash = await environment.utilities.hash.hash(masterKey, salt);

        const user = new User().makeReactive();
        user.userID = response.UserID!;
        user.email = email;
        user.lastUsed = true;
        user.masterKeyHash = hash;
        user.masterKeySalt = salt;
        user.publicKey = keys.public;
        user.privateKey = keys.private;
        user.userVaults = [];

        const appStoreState = new AppStoreState().makeReactive();
        appStoreState.appStoreStateID = response.AppStoreStateID!;
        appStoreState.userID = response.UserID!;
        appStoreState.state = "{}";
        user.appStoreState = appStoreState;

        const userPreferencesStoreState = new UserPreferencesStoreState().makeReactive();
        userPreferencesStoreState.userPreferencesStoreStateID = response.UserPreferencesStoreStateID!;
        userPreferencesStoreState.userID = response.UserPreferencesStoreStateID!;
        userPreferencesStoreState.state = "{}"
        user.userPreferencesStoreState = userPreferencesStoreState;

        const vaults = await environment.repositories.vaults.createNewVault("Personal", "#FFFFFF");
        if (!vaults)
        {
            return "no vaults";
        }

        const userVault: UserVault = vaults[0];
        const vault: Vault = vaults[1];
        const vaultKey: string = vaults[2];

        const encryptedVaultKey = await environment.utilities.crypt.ECEncrypt(keys.public, vaultKey);
        if (!encryptedVaultKey.success)
        {
            return "no encrypted vault key";
        }

        vault.lastUsed = true;

        userVault.userID = user.userID;
        userVault.user = user;
        userVault.vaultKey = JSON.stringify({
            vaultKey: encryptedVaultKey.value!,
            publicKey: encryptedVaultKey.publicKey
        });

        // Order matters here
        const transaction = new Transaction();
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
        transaction.insertEntity(userVault.vaultPreferencesStoreState, masterKey, () => environment.repositories.vaultPreferencesStoreStates);

        const lastUsedUser = await this.getLastUsedUser();
        if (lastUsedUser)
        {
            lastUsedUser.lastUsed = false;
            transaction.updateEntity(lastUsedUser, '', () => this);
        }

        const succeeded = await transaction.commit();
        if (!succeeded)
        {
            return false;
        }

        // set before backing up
        currentUserID = user.userID;

        const backupResponse = await backupData(masterKey);
        if (!backupResponse)
        {
            return false;
        }

        return true;
    }

    public async verifyUserMasterKey(masterKey: string, email?: string): Promise<boolean>
    {
        let user: User | null | undefined;
        if (email)
        {
            user = await this.findByEmail(email);
        }
        else 
        {
            user = await this.getCurrentUser();
        }

        if (!user)
        {
            return false;
        }

        const decryptedHashResponse = await environment.utilities.crypt.decrypt(masterKey, user.masterKeyHash);
        if (!decryptedHashResponse.success)
        {
            return false;
        }

        const decryptedSaltResponse = await environment.utilities.crypt.decrypt(masterKey, user.masterKeySalt);
        if (!decryptedSaltResponse.success)
        {
            return false;
        }

        const hash = await environment.utilities.hash.hash(masterKey, decryptedSaltResponse.value!);
        return environment.utilities.hash.compareHashes(decryptedHashResponse.value!, hash);
    }

    public async setCurrentUser(masterKey: string, email: string): Promise<boolean>
    {
        const user = await this.findByEmail(email);
        if (!user)
        {
            return false;
        }

        if (!(await user.verify(masterKey)))
        {
            return false;
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
            return false;
        }

        currentUserID = user.userID;
        return true;
    }

    public async getCurrentUserData(masterKey: string): Promise<string>
    {
        const failedResponse = JSON.stringify({ success: false });

        const currentUser = await this.getCurrentUser();
        if (!currentUser)
        {
            console.log('no current user');
            return failedResponse;
        }

        const decryptedAppStoreState = await environment.utilities.crypt.decrypt(masterKey, currentUser.appStoreState.state);
        if (!decryptedAppStoreState)
        {
            return failedResponse;
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
            [nameof<Vault>("color"), nameof<Vault>("name")]);

        if (!userVaults || userVaults.length == 0)
        {
            return failedResponse;
        }

        for (let i = 0; i < userVaults.length; i++)
        {
            if (userVaults[i].lastUsed)
            {
                if (!(await setCurrentVault(userVaults[i].userVaultID, false)))
                {
                    return "issue";
                }
            }

            userData.displayVaults!.push({
                userVaultID: userVaults[i].userVaultID,
                color: userVaults[i].color,
                name: userVaults[i].name,
                lastUsed: userVaults[i].lastUsed
            });
        }

        if (!userData.currentVault)
        {
            if (!(await setCurrentVault(userData.displayVaults![0].userVaultID, true)))
            {
                // TODO: return something the client can parse
                return "issue";
            }

            userData.displayVaults![0].lastUsed = true;
        }

        userData.success = true;
        return JSON.stringify(userData);

        async function setCurrentVault(id: number, setAsLastUsed: boolean)
        {
            const userVault = await environment.repositories.userVaults.getVerifiedAndDecryt(masterKey, undefined, id);
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

    public async saveUser(masterKey: string, data: string, backup: boolean)
    {
        const user = await this.getCurrentUser();
        if (!user)
        {
            return false;
        }

        const newUser: UserData = JSON.parse(data);
        const transaction = new Transaction();

        if (newUser.appStoreState)
        {
            if (!await (environment.repositories.appStoreStates.updateState(
                user.appStoreState.appStoreStateID, masterKey, newUser.appStoreState, transaction)))
            {
                return false;
            }
        }

        if (newUser.userPreferencesStoreState)
        {
            if (!await (environment.repositories.userPreferencesStoreStates.updateState(
                user.userPreferencesStoreState.userPreferencesStoreStateID, "", newUser.userPreferencesStoreState, transaction, false)))
            {
                return false;
            }
        }

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

    public async getEntityThatNeedToBeBackedUp(masterKey: string): Promise<[boolean, Partial<User> | null]>
    {
        const currentUser = await this.getCurrentUser();
        if (!currentUser)
        {
            return [false, null];
        }

        // TODO: this doesn't verify nested properties =(
        // can probably just override verify on each main entity to also verify its nested entites as well
        // like user.verify() should verify itself + appStoreState + userPrefrencesStoreState
        const response = await this.retrieveAndVerify(masterKey, getUsers);
        if (!response[0])
        {
            return [false, null];
        }

        if (!response[1])
        {
            return [true, null];
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

        return [true, userDataToBackup];

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

    public async postBackupEntityUpdates(entity: Partial<User>)
    {
        console.log(`Post backup for user: ${JSON.stringify(entity)}`);
        const currentUser = await this.getCurrentUser();
        if (!currentUser || !entity.userID || entity.userID != currentUser.userID)
        {
            return false;
        }

        const promises: any[] = [];
        try 
        {
            promises.push(this.repository.update(entity.userID, {
                entityState: EntityState.Unchanged,
                serializedPropertiesToSync: "[]"
            }));
        }
        catch 
        {
            return false;
        }


        // TODO: what to do if updating previousSignatures on store states fails? The server has been updated
        // so the client will no longer be able to update. Detect and force update data from server? Should be handled
        // when merging data?
        if (entity.appStoreState)
        {
            promises.push(environment.repositories.appStoreStates.postBackupEntityUpdates(entity.appStoreState));
        }

        if (entity.userPreferencesStoreState)
        {
            promises.push(environment.repositories.userPreferencesStoreStates.postBackupEntityUpdates(entity.userPreferencesStoreState));
        }

        await Promise.all(promises);
        return true;
    }

    public async addFromServer(masterKey: string, user: Partial<User>, transaction: Transaction): Promise<boolean>
    {
        if (!User.isValid(user))
        {
            return false;
        }

        const salt = environment.utilities.generator.randomValue(40);
        const hash = await environment.utilities.hash.hash(masterKey, salt);

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

        user.lastUsed = false;
        user.masterKeySalt = encryptedSalt.value!;
        user.masterKeyHash = encryptedHash.value!;

        transaction.insertExistingEntity(user, () => this);
        transaction.insertExistingEntity(user.appStoreState!, () => environment.repositories.appStoreStates);
        transaction.insertExistingEntity(user.userPreferencesStoreState!, () => environment.repositories.userPreferencesStoreStates);

        return true;
    }

    public async updateFromServer(currentUser: Partial<User>, newUser: Partial<User>)
    {
        if (!newUser.userID)
        {
            return;
        }

        const setProperties = {};

        if (newUser.email)
        {
            setProperties[nameof<User>("email")] = newUser.email;
        }

        if (newUser.publicKey)
        {
            setProperties[nameof<User>("publicKey")] = newUser.publicKey;
        }

        if (newUser.privateKey)
        {
            setProperties[nameof<User>("privateKey")] = newUser.privateKey;
        }

        if (newUser.signatureSecret)
        {
            setProperties[nameof<User>("signatureSecret")] = newUser.signatureSecret;
        }

        if (newUser.currentSignature)
        {
            setProperties[nameof<User>("currentSignature")] = newUser.currentSignature;
        }

        if (newUser.appStoreState)
        {
            if (!currentUser.appStoreState?.entityState)
            {
                currentUser = (await this.repository.findOneBy({
                    userID: newUser.userID
                })) as User;
            }

            if (currentUser.appStoreState?.entityState == EntityState.Updated)
            {
                // TODO: merge changes between states
            }
            else 
            {
                setProperties[nameof<User>("appStoreState")] =
                    StoreState.getUpdatedPropertiesFromObject(newUser.appStoreState);
            }
        }

        if (newUser.userPreferencesStoreState)
        {
            if (!currentUser.userPreferencesStoreState?.entityState)
            {
                currentUser = (await this.repository.findOneBy({
                    userID: newUser.userID
                })) as User;
            }

            if (currentUser.userPreferencesStoreState?.entityState == EntityState.Updated)
            {
                // TODO: merge changes between states
            }
            else 
            {
                setProperties[nameof<User>("userPreferencesStoreState")] =
                    StoreState.getUpdatedPropertiesFromObject(newUser.userPreferencesStoreState);
            }
        }

        return this.repository
            .createQueryBuilder()
            .update()
            .set(setProperties)
            .where("userID = :userID", { userID: newUser.userID })
            .execute();
    }
}

const userRepository: UserRepository = new UserRepository();
export default userRepository;
export type UserRepositoryType = typeof userRepository;