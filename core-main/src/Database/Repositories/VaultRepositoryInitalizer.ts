import { environment } from "../../Environment";
import { Vault } from "../Entities/Vault";
import { VaultData } from "../../Types/Repositories";
import { Repository } from "typeorm";
import { VaulticRepository } from "./VaulticRepositoryInitalizer";
import vaulticServer from "../../Server/VaulticServer";
import { UserVault } from "../Entities/UserVault";
import { VaultKey } from "../../Types/Properties";
import Transaction from "../Transaction";

class VaultRepository extends VaulticRepository<Vault>
{
    protected getRepository(): Repository<Vault> | undefined
    {
        return environment.databaseDataSouce.getRepository(Vault);
    }

    public async createNewVault(name: string, color: string = '#FFFFFF'): Promise<boolean | [UserVault, Vault]>
    {
        const response = await vaulticServer.vault.create();
        if (!response.Success)
        {
            return false;
        }

        const userVault = new UserVault();
        const vault = new Vault();

        userVault.userVaultID = response.UserVaultID!;
        userVault.vault = vault;
        userVault.vaultPreferencesStoreState = "{}"

        vault.vaultID = response.VaultID!;
        vault.lastUsed = true;
        vault.name = name;
        vault.color = color;
        vault.vaultStoreState = "{}";
        vault.passwordStoreState = "{}";
        vault.valueStoreState = "{}";
        vault.filterStoreState = "{}";
        vault.groupStoreState = "{}";

        return [userVault, vault];
    }

    public async getVaults(masterKey: string, properties: (keyof Vault)[], encryptedProperties: (keyof Vault)[], vaultID?: number): Promise<[Partial<Vault>[], string[]]>
    {
        const currentUser = environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            return [[], []];
        }

        const userVaultQuery = this.repository
            .createQueryBuilder('vault')
            .leftJoinAndSelect('vault.userVault', 'userVault')
            .where('userVaults.userID = :userID', { userID: currentUser?.userID });

        if (vaultID)
        {
            userVaultQuery.andWhere("vault.vaultID = :vaultID", { vaultID });
        }

        const userVaults: UserVault[] = await userVaultQuery.execute();
        if (userVaults.length == 0)
        {
            return [[], []];
        }

        const decryptedPrivateKey = await environment.utilities.crypt.decrypt(masterKey, currentUser.privateKey);
        if (!decryptedPrivateKey.success)
        {
            return [[], []];
        }

        const returnVaults: Partial<Vault>[] = [];
        const vaultKeys: string[] = [];

        for (let i = 0; i < userVaults.length; i++)
        {
            if (!(await userVaults[i].verify(decryptedPrivateKey.value!, currentUser.userID)))
            {
                return [[], []];
            }

            const decryptedVaultKeys = await environment.utilities.crypt.decrypt(decryptedPrivateKey.value!, userVaults[i].vaultKey);
            if (!decryptedVaultKeys.success)
            {
                return [[], []];
            }

            const keys: VaultKey = JSON.parse(decryptedVaultKeys.value!);
            const decryptedVaultKey = await environment.utilities.crypt.ECDecrypt(keys.publicKey, decryptedPrivateKey.value!, keys.vaultKey);
            if (!decryptedVaultKey.success)
            {
                return [[], []];
            }

            if (!(await userVaults[i].vault.verify(decryptedVaultKey.value!, currentUser.userID)))
            {
                return [[], []];
            }

            const result = await userVaults[i].vault.decryptAndGetEach(decryptedVaultKey.value!, encryptedProperties);
            if (!result[0])
            {
                return [[], []];
            }

            for (let j = 0; j < properties.length; j++)
            {
                result[1][properties[j]] = userVaults[i].vault[properties[j]];
            }

            returnVaults.push(result[1]);
            vaultKeys.push(decryptedVaultKey.value!);
        }

        return [returnVaults, vaultKeys];
    }

    public async getVault(masterKey: string, vaultID: number): Promise<VaultData | null>
    {
        const vault = await this.getVaults(masterKey, ["userID", "lastUsed"],
            ["name", "color", "appStoreState", "settingsStoreState", "passwordStoreState",
                "valueStoreState", "filterStoreState", "groupStoreState", "userPreferencesStoreState"], vaultID);

        const currentUser = environment.repositories.users.getCurrentUser();

        if (vault[0].length == 1)
        {
            const userVault = vault[0][0].userVaults?.filter(uv => uv.userID == currentUser?.userID);
            // @ts-ignore
            return { ...vault[0][0], userPreferencesStoreState: userVault[0].vaultPreferencesStoreState } as VaultData;
        }

        return null;
    }

    public async saveAndBackup(masterKey: string, vaultID: number, data: string, skipBackup: boolean = false)
    {
        const vaultInfo = await this.getVaults(masterKey, [], [], vaultID);
        if (vaultInfo[0].length == 0)
        {
            return false;
        }

        const user = environment.repositories.users.getCurrentUser();

        const oldVault = vaultInfo[0][0];
        const vaultKey = vaultInfo[1][0];

        const newVault: Vault = JSON.parse(data);
        Object.assign(oldVault, newVault);

        const succeeded = await oldVault.encryptAndSetEach!(vaultKey, Object.keys(newVault));
        if (!succeeded)
        {
            return false;
        }

        const transaction = new Transaction();
        transaction.updateEntity(oldVault as Vault, vaultKey, () => this);

        const saved = await transaction.commit(user!.userID);
        if (!saved)
        {
            return false;
        }

        if (!skipBackup)
        {
            // TODO: backup
            //const backup = oldVault.getBackup();
        }

        return true;
    }
}

const vaultRepository: VaultRepository = new VaultRepository();
export default vaultRepository;
export type VaultRepositoryType = typeof vaultRepository;