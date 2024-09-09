import { environment } from "../../Environment";
import { User } from "../Entities/User";
import { UserData } from "../../Types/Repositories";
import { VaulticRepository } from "./VaulticRepository";
import { Repository } from "typeorm";
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
let currentUser: User | undefined;

class UserRepository extends VaulticRepository<User>
{
    protected getRepository(): Repository<User> | undefined
    {
        return environment.databaseDataSouce.getRepository(User);
    }

    public getCurrentUser()
    {
        return currentUser;
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

        const vaultKey = environment.utilities.generator.randomValue(60);
        const keys = await environment.utilities.generator.ECKeys();

        const salt = environment.utilities.generator.randomValue(40);
        const hash = await environment.utilities.hash.hash(masterKey, salt);

        const user = new User();
        user.userID = response.UserID!;
        user.email = email;
        user.lastUsed = true;
        user.masterKeyHash = hash;
        user.masterKeySalt = salt;
        user.publicKey = keys.public;
        user.privateKey = keys.private;
        user.userVaults = [];

        const appStoreState = new AppStoreState();
        appStoreState.appStoreStateID = response.AppStoreStateID!;
        user.appStoreState = appStoreState;

        const userPreferencesStoreState = new UserPreferencesStoreState();
        userPreferencesStoreState.userPreferencesStoreStateID = response.UserPreferencesStoreStateID!;
        user.userPreferencesStoreState = userPreferencesStoreState;

        if (!user.lock(masterKey) || !appStoreState.lock(masterKey) || !userPreferencesStoreState.lock(masterKey))
        {
            return "no user lock";
        }

        const encryptedVaultKey = await environment.utilities.crypt.ECEncrypt(keys.public, vaultKey);
        if (!encryptedVaultKey.success)
        {
            return "no encrypted vault key";
        }

        const vaults = await environment.repositories.vaults.createNewVault("Personal", "#FFFFFF");
        if (!vaults)
        {
            return "no vaults";
        }

        const userVault: UserVault = vaults[0];
        const vault = vaults[1];

        userVault.userID = user.userID;
        userVault.user = user;
        userVault.vaultKey = JSON.stringify({
            vaultKey: encryptedVaultKey.value!,
            publicKey: encryptedVaultKey.publicKey
        });

        user.userVaults.push(userVault);

        if (!userVault.lock(masterKey))
        {
            return "no user vault lock";
        }

        if (!vault.lock(vaultKey))
        {
            return "no vault lock";
        }

        const transaction = new Transaction();
        transaction.insertEntity(user, masterKey, () => this);
        transaction.insertEntity(vault, vaultKey, () => environment.repositories.vaults);
        transaction.insertEntity(userVault, masterKey, () => environment.repositories.userVaults);

        const lastUsedUser = await this.getLastUsedUser();
        if (lastUsedUser)
        {
            lastUsedUser.lastUsed = false;
            transaction.updateEntity(lastUsedUser, '', () => this);
        }

        const succeeded = await transaction.commit();
        if (!succeeded)
        {
            return "no commit";
        }

        const backupResponse = await backupData(masterKey);
        if (!backupResponse)
        {
            return false;
        }

        currentUser = user;
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
            user = currentUser;
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

        currentUser = user;
        return true;
    }

    public async getCurrentUserData(masterKey: string): Promise<string>
    {
        const failedResponse = JSON.stringify({ success: false });
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
            userPreferencesStoreState: currentUser.userPreferencesStoreState,
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
                if (!(await setCurrentVault(userVaults[i].userVaultID)))
                {
                    return "issue";
                }
            }
            else 
            {
                userData.displayVaults!.push({
                    userVaultID: userVaults[i].userVaultID,
                    color: userVaults[i].color,
                    name: userVaults[i].name
                });
            }
        }

        if (!userData.currentVault)
        {
            if (!(await setCurrentVault(userData.displayVaults![0].userVaultID)))
            {
                return "issue";
            }

            userData.displayVaults!.splice(0, 1);
        }

        userData.success = true;
        return JSON.stringify(userData);

        async function setCurrentVault(id: number)
        {
            const userVault = await environment.repositories.userVaults.getVerifiedAndDecryt(masterKey, undefined, id);
            if (!userVault || userVault.length == 0)
            {
                return "issue";
            }

            userData.currentVault = userVault[0];
        }
    }

    public async saveUser(masterKey: string, data: string, backup: boolean)
    {
        const user = this.getCurrentUser();
        if (!user)
        {
            return false;
        }

        const parsedData = JSON.parse(data);
        user.copyFrom(parsedData);
        user.entityState = EntityState.Updated;

        const { userPreferencesStoreState, ...newUser } = parsedData;

        const succeeded = await user.encryptAndSetFromObject!(masterKey, newUser);
        if (!succeeded)
        {
            return false;
        }

        const transaction = new Transaction();
        transaction.updateEntity(user, masterKey, () => this);

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

    public async getEntitesThatNeedToBeBackedUp(masterKey: string): Promise<[boolean, Partial<User> | null]>
    {
        const currentUser = this.getCurrentUser();
        if (!currentUser)
        {
            return [false, null];
        }

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
            userDataToBackup["user"] = user.getBackup();
        }
        else 
        {
            // make sure we always add the userID, even if just store states are being updated
            userDataToBackup["user"] = { userID: user.userID }
        }

        if (user.appStoreState.propertiesToSync.length > 0)
        {
            userDataToBackup["user"]["appStoreState"] = user.appStoreState.getBackup();
        }

        if (user.userPreferencesStoreState.propertiesToSync.length > 0)
        {
            userDataToBackup["user"]["userPreferencesStoreState"] = user.userPreferencesStoreState.getBackup();
        }

        return [true, userDataToBackup];

        function getUsers(repository: Repository<User>): Promise<User | null>
        {
            return repository
                .createQueryBuilder("users")
                .leftJoinAndSelect("users.appStoreState", "appStoreState")
                .leftJoinAndSelect("users.userPreferencesStoreState", "userPreferencesStoreState")
                .where("user.userID = :userID", { userID: currentUser?.userID })
                .andWhere(`
                    user.entityState != :entityState OR 
                    appStoreState.entityState != :entityState OR 
                    userPreferencesStoreState.entityState != :entityState`,
                    { entityState: EntityState.Unchanged })
                .getOne();
        }
    }

    public async resetBackupTrackingForEntity(entity: Partial<User>)
    {
        const currentUser = this.getCurrentUser();
        if (!currentUser || !entity.userID || entity.userID != currentUser.userID)
        {
            return false;
        }

        this.repository
            .createQueryBuilder("users")
            .innerJoin("users.appStoreState", "appStoreState")
            .innerJoin("users.userPreferencesStoreState", "userPreferencesStoreState")
            .update()
            .set(
                {
                    entityState: EntityState.Unchanged,
                    serializedPropertiesToSync: "[]",
                    appStoreState: {
                        entityState: EntityState.Unchanged,
                        serializedPropertiesToSync: "[]"
                    },
                    userPreferencesStoreState: {
                        entityState: EntityState.Unchanged,
                        serializedPropertiesToSync: "[]"
                    }
                }
            )
            .where("userID = :userID", { userID: entity.userID })
            .execute();

        return true;
    }

    public async addFromServer(user: Partial<User>)
    {
        if (!user.userID ||
            !user.email ||
            !user.signatureSecret ||
            !user.currentSignature ||
            !user.publicKey ||
            !user.privateKey ||
            !user.appStoreState ||
            !user.userPreferencesStoreState)
        {
            return;
        }

        // TODO: make sure this saves appStoreState and userPreferncesStorState correctly
        return this.repository.insert(user);
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