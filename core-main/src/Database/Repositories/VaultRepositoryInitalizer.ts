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
        userVault.vaultID = response.VaultID!;
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

    public async getVaults(masterKey: string, properties: (keyof Vault)[], encryptedProperties: (keyof Vault)[], vaultID?: number): Promise<[Vault[], string[]]>
    {
        const currentUser = environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            console.log('no user')
            return [[], []];
        }

        const userVaults: UserVault[] = await environment.repositories.userVaults.getUserVaults(vaultID);
        if (userVaults.length == 0)
        {
            console.log('no user vaults')
            return [[], []];
        }

        const decryptedPrivateKey = await environment.utilities.crypt.decrypt(masterKey, currentUser.privateKey);
        if (!decryptedPrivateKey.success)
        {
            console.log('no private key decrypt')
            return [[], []];
        }

        const returnVaults: Vault[] = [];
        const vaultKeys: string[] = [];

        for (let i = 0; i < userVaults.length; i++)
        {
            if (!(await userVaults[i].verify(masterKey)))
            {
                console.log('un verified user vault')
                return [[], []];
            }

            const decryptedVaultKeys = await environment.utilities.crypt.decrypt(masterKey, userVaults[i].vaultKey);
            if (!decryptedVaultKeys.success)
            {
                console.log('no vault keys decrypt')
                return [[], []];
            }

            const keys: VaultKey = JSON.parse(decryptedVaultKeys.value!);
            const decryptedVaultKey = await environment.utilities.crypt.ECDecrypt(keys.publicKey, decryptedPrivateKey.value!, keys.vaultKey);
            if (!decryptedVaultKey.success)
            {
                console.log('no vault key decrypt')
                return [[], []];
            }

            // if (!(await userVaults[i].vault.verify(decryptedVaultKey.value!)))
            // {
            //     console.log('no vault verify')
            //     return [[], []];
            // }

            const result = await userVaults[i].vault.decryptAndGetEach(decryptedVaultKey.value!, encryptedProperties);
            if (!result[0])
            {
                console.log('no vault decrypt')
                return [[], []];
            }

            for (let j = 0; j < properties.length; j++)
            {
                result[1][properties[j]] = userVaults[i].vault[properties[j]];
            }

            returnVaults.push(result[1] as Vault);
            vaultKeys.push(decryptedVaultKey.value!);
        }

        return [returnVaults, vaultKeys];
    }

    public async getVault(masterKey: string, vaultID: number): Promise<VaultData | null>
    {
        const vault = await this.getVaults(masterKey, ["vaultID", "lastUsed"],
            ["name", "color", "vaultStoreState", "passwordStoreState",
                "valueStoreState", "filterStoreState", "groupStoreState"], vaultID);

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
        // get all fields. Don't decrypt any of them because they may not be being updated
        const vaultInfo = await this.getVaults(masterKey, ["signature", "signatureSecret", "vaultID", "lastUsed", "name", "color",
            "vaultStoreState", "passwordStoreState", "valueStoreState", "filterStoreState", "groupStoreState"], [], vaultID);

        if (vaultInfo[0].length == 0)
        {
            return false;
        }

        const oldVault = vaultInfo[0][0];
        const vaultKey = vaultInfo[1][0];

        console.log(oldVault);

        const newVault: Vault = JSON.parse(data);
        console.log(newVault);

        Object.assign(oldVault, newVault);

        console.log(oldVault);
        const succeeded = await oldVault.encryptAndSetEach!(vaultKey, Object.keys(newVault));
        if (!succeeded)
        {
            return false;
        }

        const transaction = new Transaction();
        transaction.updateEntity(oldVault, vaultKey, () => this);

        const saved = await transaction.commit();
        if (!saved)
        {
            return false;
        }

        // TODO: this should be done seperatly. not being able to backup shouldn't be considered the same 
        // as an error while saving
        if (!skipBackup)
        {
            const backupResponse = await vaulticServer.user.backupData(undefined, undefined, [oldVault.getBackup()]);
            if (!backupResponse.Success)
            {
                //return JSON.stringify(backupResponse);
            }
        }

        return true;
    }
}

const vaultRepository: VaultRepository = new VaultRepository();
export default vaultRepository;
export type VaultRepositoryType = typeof vaultRepository;