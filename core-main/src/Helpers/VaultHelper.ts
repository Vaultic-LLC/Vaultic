import { CondensedVaultData } from "@vaultic/shared/Types/Entities";
import { UserVault } from "../Database/Entities/UserVault";
import { Vault } from "../Database/Entities/Vault";
import Transaction from "../Database/Transaction";
import { environment } from "../Environment";
import axiosHelper from "../Server/AxiosHelper";
import vaulticServer from "../Server/VaulticServer";
import { userDataE2EEncryptedFieldTree } from "../Types/FieldTree";
import { VaultKey } from "../Types/Properties";
import { safetifyMethod } from "./RepositoryHelper";
import { MethodResponse, TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import errorCodes from "@vaultic/shared/Types/ErrorCodes";
import { UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";
import { DeepPartial } from "@vaultic/shared/Helpers/TypeScriptHelper";

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

    public async decryptCondensedUserVault(vaultKey: string, condensedVault: CondensedVaultData, propertiesToDecrypt?: string[])
    {
        const decryptableProperties = propertiesToDecrypt ?? Vault.getDecryptableProperties();
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

    public async loadArchivedVault(masterKey: string, userVaultID: number): Promise<TypedMethodResponse<boolean | CondensedVaultData | undefined>>
    {
        return await safetifyMethod(this, internalLoadArchiveVault);

        async function internalLoadArchiveVault(this: VaultHelper): Promise<TypedMethodResponse<boolean | CondensedVaultData>>
        {
            const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
            if (!currentUser)
            {
                return TypedMethodResponse.fail(errorCodes.VERIFICATION_FAILED, undefined, "User");
            }

            const response = await vaulticServer.vault.getArchivedVaultData(userVaultID);
            if (!response.Success)
            {
                return TypedMethodResponse.fail(undefined, undefined, "Failed to get archived vault from server");
            }

            const decryptedData = await axiosHelper.api.decryptEndToEndData(userDataE2EEncryptedFieldTree, response);
            if (!decryptedData.success)
            {
                return TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED, undefined, "E2E Archived Vault Data");
            }

            const userDataPayload: UserDataPayload = decryptedData.value.userDataPayload!;

            if (!userDataPayload.userVaults?.[0] || !userDataPayload.vaults?.[0])
            {
                return TypedMethodResponse.fail(undefined, undefined, "No Vault or UserVault");
            }

            const userVault: DeepPartial<UserVault> = userDataPayload.userVaults[0];
            const vault: DeepPartial<Vault> = userDataPayload.vaults[0];

            const decryptedVaultKey = await this.decryptVaultKey(masterKey, currentUser.privateKey, true, userVault.vaultKey!);
            if (!decryptedVaultKey.value)
            {
                return TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED, undefined, "Vault Key");
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

            condensedVault = await this.decryptCondensedUserVault(decryptedVaultKey.value!, condensedVault);
            if (!condensedVault)
            {
                return TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED, undefined, "Condensed Vault Data");
            }

            return TypedMethodResponse.success(condensedVault);
        }
    }

    public async unarchiveVault(masterKey: string, userVaultID: number, select: boolean): Promise<TypedMethodResponse<boolean | CondensedVaultData | undefined>>
    {
        return await safetifyMethod(this, internalUnarchiveVault);

        async function internalUnarchiveVault(this: VaultHelper): Promise<TypedMethodResponse<boolean | CondensedVaultData>>
        {
            const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
            if (!currentUser)
            {
                return TypedMethodResponse.fail(errorCodes.VERIFICATION_FAILED, undefined, "User");
            }

            const response = await vaulticServer.vault.unarchiveVault(userVaultID);
            if (!response.Success)
            {
                return TypedMethodResponse.fail(undefined, undefined, "Failed to un archive vault on server");
            }

            const decryptedData = await axiosHelper.api.decryptEndToEndData(userDataE2EEncryptedFieldTree, response);
            if (!decryptedData.success)
            {
                return TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED, undefined, "E2E Archived Vault Data");
            }

            const userDataPayload: UserDataPayload = decryptedData.value.userDataPayload!;

            if (!userDataPayload.userVaults?.[0] || !userDataPayload.vaults?.[0])
            {
                return TypedMethodResponse.fail(undefined, undefined, "No Vault or UserVault");
            }

            const userVault: DeepPartial<UserVault> = userDataPayload.userVaults[0];
            const vault: DeepPartial<Vault> = userDataPayload.vaults[0];

            const transaction = new Transaction();
            environment.repositories.vaults.addFromServer(vault, transaction);
            environment.repositories.userVaults.addFromServer(userVault, transaction);

            if (!(await transaction.commit()))
            {
                return TypedMethodResponse.fail(errorCodes.TRANSACTION_FAILED);
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
                return TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED, undefined, "Vault Key");
            }

            condensedVault = await this.decryptCondensedUserVault(decryptedVaultKey.value!, condensedVault);
            if (!condensedVault)
            {
                return TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED, undefined, "Condensed Vault Data");
            }

            return TypedMethodResponse.success(condensedVault);
        }
    }
}

const vaultHelper: VaultHelper = new VaultHelper();
export default vaultHelper;