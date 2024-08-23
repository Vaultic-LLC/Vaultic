import { environment } from "../../Environment";
import { User } from "../Entities/User";
import { UserData } from "../../Types/Repositories";
import { VaulticRepository } from "./VaulticRepositoryInitalizer";
import { Repository } from "typeorm";
import Transaction from "../Transaction";
import vaulticServer from "../../Server/VaulticServer";

// TODO: move to cache
let currentUser: User | undefined;

class UserRepository extends VaulticRepository<User>
{
    protected getRepository(): Repository<User> | undefined
    {
        return environment.databaseDataSouce.getRepository(User);
    }

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

        const userVault = vaults[0];
        const vault = vaults[1];

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

        console.log("saving");
        const transaction = new Transaction();
        transaction.insertEntity(user, masterKey, () => this);
        transaction.insertEntity(userVault, masterKey, () => environment.repositories.userVaults);
        transaction.insertEntity(vault, vaultKey, () => environment.repositories.vaults);

        const succeeded = await transaction.commit(user.userID);
        if (!succeeded)
        {
            return "no commit";
        }

        console.log("saving complete");
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

    public getCurrentUser()
    {
        return currentUser;
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

    public findByEmail(email: string) 
    {
        return this.repository.findOneBy({
            email: email
        });
    }

    public async setCurrentUser(masterKey: string, email: string): Promise<boolean>
    {
        const user = await this.findByEmail(email);
        if (!user)
        {
            return false;
        }

        if (!(await user.verify(masterKey, user.userID)))
        {
            return false;
        }

        currentUser = user;
        return true;
    }

    public async getLastUsedUserEmail(): Promise<string | null>
    {
        const lastUsedUser = await this.repository.findOneBy({
            lastUsed: true
        });

        return lastUsedUser?.email ?? null;
    }

    public async getLastUsedUserPreferences(): Promise<string | null>
    {
        const lastUsedUser = await this.repository.findOneBy({
            lastUsed: true
        });

        return lastUsedUser?.userPreferencesStoreState ?? null;
    }

    public async getCurrentUserData(masterKey: string, response: any): Promise<string>
    {
        const failedResponse = JSON.stringify({ success: false });
        if (!currentUser)
        {
            return failedResponse;
        }

        const userData: UserData =
        {
            success: false,
            appStoreState: currentUser.appStoreState,
            userPreferencesStoreState: undefined,
            displayVaults: [],
            currentVault: undefined
        };

        const vaults = await environment.repositories.vaults.getVaults(masterKey, ["userID", "lastUsed"],
            ["name", "color", "appStoreState", "settingsStoreState", "passwordStoreState",
                "valueStoreState", "filterStoreState", "groupStoreState", "userPreferencesStoreState"]);

        if (vaults[0].length == 0)
        {
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
}

const userRepository: UserRepository = new UserRepository();
export default userRepository;
export type UserRepositoryType = typeof userRepository;