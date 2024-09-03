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

        const backupResponse = await vaulticServer.user.backupData(user.getBackup(), [userVault.getBackup()], [vault.getBackup()]);
        if (!backupResponse.Success)
        {
            return backupResponse.message!;
        }

        currentUser = user;
        return true;
    }

    // when logging in for the first time as a user that already exists
    public addUser()
    {

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

    public async getCurrentUserData(masterKey: string, response: any): Promise<string>
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

    public async saveUser(masterKey: string, data: string)
    {
        const user = this.getCurrentUser();
        if (!user)
        {
            return false;
        }

        const parsedData = JSON.parse(data);
        user.copyFrom(parsedData);

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

        // TODO: this should be done seperatly. not being able to backup shouldn't be considered the same 
        // as an error while saving
        // Can do this only if its a shared vault =)
        const backupResponse = await vaulticServer.user.backupData(user.getBackup(), undefined, undefined);
        if (!backupResponse.Success)
        {
            //return JSON.stringify(backupResponse);
        }

        return true;
    }
}

const userRepository: UserRepository = new UserRepository();
export default userRepository;
export type UserRepositoryType = typeof userRepository;