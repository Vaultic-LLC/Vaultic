import { environment } from "../../Environment";
import { User } from "../Entities/User";
import { UserData } from "../../Types/Repositories";
import { VaulticRepository } from "./VaulticRepositoryInitalizer";
import { Repository } from "typeorm";
import Transaction from "../Transaction";
import vaulticServer from "../../Server/VaulticServer";
import { UserVault } from "../Entities/UserVault";

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

    public getLastUsedUser()
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
        return lastUsedUser?.userPreferencesStoreState ?? null;
    }

    // TODO: better handle failed
    public async createUser(masterKey: string, email: string): Promise<boolean | string>
    {
        const response = await vaulticServer.user.getUserID();
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
        user.appStoreState = "{}";
        user.userPreferencesStoreState = "{}";
        user.userVaults = [];

        if (!user.lock(masterKey))
        {
            return "no user lock";
        }

        const encryptedVaultKey = await environment.utilities.crypt.ECEncrypt(keys.public, vaultKey);
        if (!encryptedVaultKey.success)
        {
            return "no encrypted vault key";
        }

        const vaults = await environment.repositories.vaults.createNewVault("Personal");
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

        const decryptedAppStoreState = await environment.utilities.crypt.decrypt(masterKey, currentUser.appStoreState);
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

        const vaults = await environment.repositories.vaults.getVaults(masterKey, ["vaultID", "lastUsed"],
            ["name", "color", "vaultStoreState", "passwordStoreState",
                "valueStoreState", "filterStoreState", "groupStoreState"]);

        console.log(vaults);

        if (vaults[0].length == 0)
        {
            console.log('no vaults');
            return failedResponse;
        }

        for (let i = 0; i < vaults[0].length; i++)
        {
            if (vaults[0][i].lastUsed)
            {
                const userVault = await environment.repositories.userVaults.getByVaultID(vaults[0][i].vaultID!);
                // @ts-ignore
                userData.currentVault = { ...vaults[0][i], vaultPreferencesStoreState: userVault?.vaultPreferencesStoreState };
            }
            else 
            {
                // @ts-ignore
                userData.displayVaults.push({
                    id: vaults[0][i].vaultID!,
                    color: vaults[0][i].color!,
                    name: vaults[0][i].name!
                });
            }
        }

        if (!userData.currentVault)
        {
            const userVault = await environment.repositories.userVaults.getByVaultID(userData.currentVault![0].vaultID);
            userData.currentVault = { ...userData.currentVault![0], vaultPreferencesStoreState: userVault?.vaultPreferencesStoreState };
            userData.displayVaults!.splice(0, 1);
        }

        userData.success = true;
        return JSON.stringify(userData);
    }

    public async saveUser(masterKey: string, data: string)
    {
        const user = this.getCurrentUser();
        if (!user)
        {
            return false;
        }

        const parsedData = JSON.parse(data);
        Object.assign(user, parsedData);

        const { userPreferencesStoreState, ...newUser } = parsedData;

        const succeeded = await user.encryptAndSetEach!(masterKey, Object.keys(newUser));
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