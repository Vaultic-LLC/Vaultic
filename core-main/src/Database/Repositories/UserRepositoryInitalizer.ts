import { environment } from "../../Environment";
import { User } from "../Entities/User";
import { UserRepository } from "../../Types/Repositories";
import { UserVault } from "../Entities/UserVault";
import { VaulticRepositoryInitalizer } from "./VaulticRepositoryInitalizer";
import { Repository } from "typeorm";
import Transaction from "../Transaction";

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
            deleteUserAndVault: this.deleteUserAndVault
        }
    }

    protected async createUser(masterKey: string, userIdentifier: string, email: string): Promise<boolean | string>
    {
        const vaultKey = environment.utilities.generator.randomValue(60);
        const keys = await environment.utilities.generator.ECKeys();

        const salt = environment.utilities.generator.randomValue(40);
        const hash = await environment.utilities.hash.hash(masterKey, salt);

        const user = new User();
        user.userIdentifier = userIdentifier;
        user.email = email;
        user.masterKeyHash = hash;
        user.masterKeySalt = salt;
        user.publicKey = keys.public;
        user.privateKey = keys.private;

        if (!user.lock(masterKey))
        {
            return false;
        }

        const encryptedVaultKey = await environment.utilities.crypt.ECEncrypt(keys.public, vaultKey);
        if (!encryptedVaultKey.success)
        {
            return false;
        }

        const vault = await environment.repositories.vaults.createNewVault("Personal");
        if (!vault.lock(vaultKey))
        {
            return false;
        }

        const userVault = new UserVault();
        userVault.user = user;
        userVault.vault = vault;
        userVault.vaultKey = JSON.stringify({
            vaultKey: encryptedVaultKey.value!,
            publicKey: encryptedVaultKey.publicKey
        });

        user.userVaults.push(userVault);

        if (!userVault.lock(masterKey))
        {
            return false;
        }

        const transaction = new Transaction();
        transaction.saveEntity(user, masterKey, () => this.repository);
        transaction.saveEntity(userVault, masterKey, () => environment.repositories.userVaults);
        transaction.saveEntity(vault, vaultKey, () => environment.repositories.vaults);

        const succeeded = await transaction.commit(user.userIdentifier);
        if (!succeeded)
        {
            return false;
        }

        const { userVaults, ...tempUser } = user;
        const { user: u, vault: v, ...tempUserVault } = userVault;
        const { userVaults: uvs, ...tempVault } = vault;

        return JSON.stringify({
            user: tempUser,
            userVault: tempUserVault,
            vault: tempVault
        });
    }

    protected async deleteUserAndVault(masterKey: string, userIdentifier: string, vaultIdentifier: string): Promise<boolean>
    {
        const user = await this.getUserAndVaultByIdentifiers(userIdentifier, vaultIdentifier);
        if (!user)
        {
            return false;
        }

        if (!(await this.verifyMasterKey(user, masterKey)))
        {
            return false;
        }

        const transaction = new Transaction();
        transaction.deleteEntity(user.userVaults[0], () => environment.repositories.userVaults);
        transaction.deleteEntity(user.userVaults[0].vault, () => environment.repositories.vaults);
        transaction.deleteEntity(user, () => this.repository);

        return transaction.commit(userIdentifier);
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

        if (!(await this.verifyMasterKey(user, masterKey)))
        {
            return false;
        }

        currentUser = user;
        return true;
    }

    protected async getUserAndVaultByIdentifiers(userIdentifier: string, vaultIdentifier: string): Promise<User | null>
    {
        return this.repository.createQueryBuilder("users")
            .innerJoinAndSelect("users.userVaults", "userVaults")
            .innerJoinAndSelect("userVaults.vault", "vaults")
            .where("users.userIdentifier = :userIdentifier", { userIdentifier })
            .andWhere("vaults.vaultIdentifier = :vaultIdentifier", { vaultIdentifier })
            .getOne();
    }
}

const userRepositoryInitalizer: UserRepositoryInitalizer = new UserRepositoryInitalizer();
export default userRepositoryInitalizer;