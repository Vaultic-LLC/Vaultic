import { UserVault } from "../Database/Entities/UserVault";
import { Vault } from "../Database/Entities/Vault";
import Transaction from "../Database/Transaction";
import { environment } from "../Environment";
import axiosHelper from "../Server/AxiosHelper";
import vaulticServer from "../Server/VaulticServer";
import { userDataE2EEncryptedFieldTree } from "../Types/FieldTree";
import { MethodResponse } from "../Types/MethodResponse";
import { VaultKey } from "../Types/Properties";
import { CondensedVaultData } from "../Types/Repositories";
import { UserDataPayload } from "../Types/ServerTypes";
import { DeepPartial } from "./TypeScriptHelper";

class VaultHelper 
{
    public async decryptVaultKey(masterKey: string, privateKey: string, decryptPrivateKey: boolean, vaultKey: string): Promise<MethodResponse>
    {
        if (decryptPrivateKey)
        {
            const decryptedPrivateKey = await environment.utilities.crypt.decrypt(masterKey, privateKey);
            if (!decryptedPrivateKey.success)
            {
                return decryptedPrivateKey;
            }

            privateKey = decryptedPrivateKey.value!;
        }

        const decryptedVaultKeys = await environment.utilities.crypt.decrypt(masterKey, vaultKey);
        if (!decryptedVaultKeys.success)
        {
            return decryptedVaultKeys;
        }

        const keys: VaultKey = JSON.parse(decryptedVaultKeys.value!);
        return await environment.utilities.crypt.ECDecrypt(keys.publicKey, privateKey, keys.vaultKey);
    }

    public async decryptCondensedUserVault(masterKey: string, vaultKey: string, condensedVault: CondensedVaultData, propertiesToDecrypt?: string[])
    {
        const decryptableProperties = propertiesToDecrypt ?? Vault.getDecryptableProperties();
        // const decryptedVaultPreferences = await environment.utilities.crypt.decrypt(masterKey, condensedVault.vaultPreferencesStoreState);
        // if (!decryptedVaultPreferences.success)
        // {
        //     return null;
        // }

        // condensedVault.vaultPreferencesStoreState = decryptedVaultPreferences.value!;

        for (let j = 0; j < decryptableProperties.length; j++)
        {
            const response = await environment.utilities.crypt.decrypt(vaultKey, condensedVault[decryptableProperties[j]]);
            if (!response.success)
            {
                return null;
            }

            condensedVault[decryptableProperties[j]] = response.value!;
        }

        return condensedVault;
    }

    public async loadArchivedVault(masterKey: string, userVaultID: number): Promise<boolean | CondensedVaultData | null>
    {
        const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
        if (!currentUser)
        {
            return false;
        }

        const response = await vaulticServer.vault.getArchivedVaultData(userVaultID);
        if (!response.Success)
        {
            return false;
        }

        const decryptedData = await axiosHelper.api.decryptEndToEndData(userDataE2EEncryptedFieldTree, response);
        if (!decryptedData.success)
        {
            return false;
        }

        const userDataPayload: UserDataPayload = decryptedData.value.userDataPayload!;

        if (!userDataPayload.userVaults?.[0] || !userDataPayload.vaults?.[0])
        {
            return false;
        }

        const userVault: DeepPartial<UserVault> = userDataPayload.userVaults[0];
        const vault: DeepPartial<Vault> = userDataPayload.vaults[0];

        const decryptedVaultKey = await this.decryptVaultKey(masterKey, currentUser.privateKey, true, userVault.vaultKey!);
        if (!decryptedVaultKey.value)
        {
            return false;
        }

        let condensedVault: CondensedVaultData | null =
        {
            userVaultID: userVault.userVaultID!,
            vaultPreferencesStoreState: userVault.vaultPreferencesStoreState!.state!,
            name: vault.name!,
            vaultStoreState: vault.vaultStoreState!.state!,
            passwordStoreState: vault.passwordStoreState!.state!,
            valueStoreState: vault.vaultStoreState!.state!,
            filterStoreState: vault.filterStoreState!.state!,
            groupStoreState: vault.groupStoreState!.state!,
            lastUsed: false
        };

        condensedVault = await this.decryptCondensedUserVault(masterKey, decryptedVaultKey.value!, condensedVault);
        return condensedVault;
    }

    public async unarchiveVault(masterKey: string, userVaultID: number, select: boolean): Promise<boolean | CondensedVaultData | null>
    {
        const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
        if (!currentUser)
        {
            return true;
        }

        const response = await vaulticServer.vault.unarchiveVault(userVaultID);
        if (!response.Success)
        {
            return false;
        }

        const decryptedData = await axiosHelper.api.decryptEndToEndData(userDataE2EEncryptedFieldTree, response);
        if (!decryptedData.success)
        {
            return false;
        }

        const userDataPayload: UserDataPayload = decryptedData.value.userDataPayload!;

        if (!userDataPayload.userVaults?.[0] || !userDataPayload.vaults?.[0])
        {
            return false;
        }

        const userVault: DeepPartial<UserVault> = userDataPayload.userVaults[0];
        const vault: DeepPartial<Vault> = userDataPayload.vaults[0];

        const transaction = new Transaction();
        environment.repositories.vaults.addFromServer(vault, transaction);
        environment.repositories.userVaults.addFromServer(userVault, transaction);

        if (!(await transaction.commit()))
        {
            return false;
        }

        if (select)
        {
            await environment.repositories.vaults.setLastUsedVault(currentUser, userVault.userVaultID!);
        }

        let condensedVault: CondensedVaultData | null =
        {
            userVaultID: userVault.userVaultID!,
            vaultPreferencesStoreState: userVault.vaultPreferencesStoreState!.state!,
            name: vault.name!,
            vaultStoreState: vault.vaultStoreState!.state!,
            passwordStoreState: vault.passwordStoreState!.state!,
            valueStoreState: vault.vaultStoreState!.state!,
            filterStoreState: vault.filterStoreState!.state!,
            groupStoreState: vault.groupStoreState!.state!,
            lastUsed: false
        };

        const decryptedVaultKey = await this.decryptVaultKey(masterKey, currentUser.privateKey, true, userVault.vaultKey!);
        if (!decryptedVaultKey.value)
        {
            return false;
        }

        condensedVault = await this.decryptCondensedUserVault(masterKey, decryptedVaultKey.value!, condensedVault);
        return condensedVault;
    }
}

const vaultHelper: VaultHelper = new VaultHelper();
export type VaultHelperType = typeof vaultHelper;
export default vaultHelper;