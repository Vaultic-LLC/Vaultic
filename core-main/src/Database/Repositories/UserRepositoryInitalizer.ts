import { environment } from "../../Environment";
import { User } from "../Entities/User";
import { UserRepository } from "../../Types/Repositories";
import { VaulticRepositoryInitalizer } from "./VaulticRepositoryInitalizer";
import { Repository } from "typeorm";
import Transaction from "../Transaction";
import vaulticServer from "../../Server/VaulticServer";
import cryptHelper from "../../../../core-renderer/src/Helpers/cryptHelper";

// TODO: move to cache
let currentUser: User | undefined;

class UserRepositoryInitalizer extends VaulticRepositoryInitalizer<User, UserRepository>
{
    protected getRepository(): Repository<User> | undefined
    {
        return environment.databaseDataSouce.getRepository(User);
    }

    protected getRepositoryExtension(): any 
    {
        return {
            createUser: this.createUser,
            getCurrentUser: this.getCurrentUser,
            setCurrentUser: this.setCurrentUser,
            findByIdentifier: this.findByIdentifier,
        }
    }

    protected async createUser(masterKey: string, email: string): Promise<boolean | string>
    {
        const response = await vaulticServer.user.getUserID();
        if (!response.Success)
        {
            return false;
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

        if (!user.lock(masterKey))
        {
            return false;
        }

        const encryptedVaultKey = await environment.utilities.crypt.ECEncrypt(keys.public, vaultKey);
        if (!encryptedVaultKey.success)
        {
            return false;
        }

        const vaults = await environment.repositories.vaults.createNewVault("Personal");
        if (!vaults)
        {
            return false;
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
            return false;
        }

        if (!vault.lock(vaultKey))
        {
            return false;
        }

        const transaction = new Transaction();
        transaction.saveEntity(user, masterKey, () => this.repository);
        transaction.saveEntity(userVault, masterKey, () => environment.repositories.userVaults);
        transaction.saveEntity(vault, vaultKey, () => environment.repositories.vaults);

        const succeeded = await transaction.commit(user.userID);
        if (!succeeded)
        {
            return false;
        }

        const backupResponse = await vaulticServer.user.backupData(user.getBackup(), [userVault.getBackup()], [vault.getBackup()]);
        if (!backupResponse.Success)
        {
            return false;
        }

        currentUser = user;
        return true;
    }

    // when logging in for the first time as a user that already exists
    protected addUser()
    {

    }

    protected getCurrentUser()
    {
        return currentUser;
    }

    protected async verifyMasterKey(user: User, masterKey: string): Promise<boolean>
    {
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

    protected findByIdentifier(userIdentifier: string) 
    {
        return this.repository.findOneBy({
            userIdentifier: userIdentifier
        });
    }

    protected async setCurrentUser(masterKey: string, userIdentifier: string): Promise<boolean>
    {
        const user = await this.findByIdentifier(userIdentifier);
        if (!user)
        {
            return false;
        }

        if (!(await user.verify(masterKey, user.userID)))
        {
            return false;
        }

        if (!(await this.verifyMasterKey(user, masterKey)))
        {
            return false;
        }

        currentUser = user;
        return true;
    }

    protected async getLastUsedUserEmail(): Promise<string | null>
    {
        const lastUsedUser = await this.repository.findOneBy({
            lastUsed: true
        });

        return lastUsedUser?.email ?? null;
    }

    protected async getLastUsedUserPreferences(): Promise<string | null>
    {
        const lastUsedUser = await this.repository.findOneBy({
            lastUsed: true
        });

        return lastUsedUser?.userPreferencesStoreState ?? null;
    }

    protected async getCurrentUserData(masterKey: string, response: any): Promise<any>
    {
        if (!currentUser)
        {
            return null;
        }

        const userData = {
            appStoreState: currentUser.appStoreState,
            displayVaults: [],
            currentVault: undefined
        };

        const vaults = await environment.repositories.vaults.getVaults(masterKey, ["userID", "lastUsed"],
            ["name", "color", "appStoreState", "settingsStoreState", "passwordStoreState",
                "valueStoreState", "filterStoreState", "groupStoreState", "userPreferencesStoreState"]);

        if (vaults[0].length == 0)
        {
            return false;
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
                    id: vaults[0][i].vaultID,
                    color: vaults[0][i].color,
                    name: vaults[0][i].name
                });
            }
        }

        if (!userData.currentVault)
        {
            const userVault = await environment.repositories.userVaults.getByVaultID(userData.currentVault[0].vaultID);
            userData.currentVault = { ...userData.currentVault[0], vaultPreferencesStoreState: userVault?.vaultPreferencesStoreState };
            userData.displayVaults.splice(0, 1);
        }

        userData['success'] = true;
        return userData;
    }
}

const userRepositoryInitalizer: UserRepositoryInitalizer = new UserRepositoryInitalizer();
export default userRepositoryInitalizer;