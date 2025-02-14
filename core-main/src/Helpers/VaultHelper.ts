import { CondensedVaultData } from "@vaultic/shared/Types/Entities";
import { Vault } from "../Database/Entities/Vault";
import { environment } from "../Environment";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { MLKEM1024KeyResult, PublicKeyType, SignedVaultKey, SignedVaultKeyMessage } from "@vaultic/shared/Types/Keys";
import vaulticServer from "../Server/VaulticServer";

class VaultHelper 
{
    public async prepareVaultKeyForRecipient(senderUserID: number, sendingPrivateSigningKey: string,
        recipientPublicEncryptingKey: string, vaultKey: string): Promise<TypedMethodResponse<string | undefined>>
    {
        const asymmetricEncryptResult = await environment.utilities.crypt.asymmeticEncrypt(recipientPublicEncryptingKey, vaultKey);
        if (!asymmetricEncryptResult.success)
        {
            return asymmetricEncryptResult as TypedMethodResponse<string | undefined>;
        }

        const keyResult: MLKEM1024KeyResult = asymmetricEncryptResult.value as MLKEM1024KeyResult;
        const message: SignedVaultKeyMessage =
        {
            senderUserID,
            cipherText: keyResult.cipherText,
            vaultKey: keyResult.value
        };

        const signature = environment.utilities.crypt.sign(sendingPrivateSigningKey, JSON.vaulticStringify(message));
        return TypedMethodResponse.success(JSON.stringify({
            signature: signature,
            message
        }));
    }

    public async evaluateVaultKeyFromSender(recipientPrivateEncryptingKey: string, signedVaultKey: string)
        : Promise<TypedMethodResponse<string | undefined>>
    {
        const parsedVaultKey: SignedVaultKey = JSON.vaulticParse(signedVaultKey);
        const publicKeyResponse = await vaulticServer.user.getPublicKeys(PublicKeyType.Signing, [parsedVaultKey.message.senderUserID]);
        if (!publicKeyResponse.Success)
        {
            return TypedMethodResponse.fail();
        }

        if (!publicKeyResponse.UsersAndPublicKeys?.[parsedVaultKey.message.senderUserID]?.PublicSigningKey)
        {
            return TypedMethodResponse.fail();
        }

        const verifyResult = await environment.utilities.crypt.verify(publicKeyResponse.UsersAndPublicKeys[parsedVaultKey.message.senderUserID].PublicSigningKey, parsedVaultKey);
        if (!verifyResult.success || !verifyResult.value)
        {
            return TypedMethodResponse.fail();
        }

        return await environment.utilities.crypt.asymmetricDecrypt(recipientPrivateEncryptingKey, parsedVaultKey.message.vaultKey, parsedVaultKey.message.cipherText);
    }

    public async decryptCondensedUserVault(vaultKey: string, condensedVault: CondensedVaultData, propertiesToDecrypt?: string[])
    {
        const decryptableProperties = propertiesToDecrypt ?? Vault.getDecryptableProperties();
        for (let j = 0; j < decryptableProperties.length; j++)
        {
            const response = await environment.utilities.crypt.symmetricDecrypt(vaultKey, condensedVault[decryptableProperties[j]]);
            if (!response.success)
            {
                return null;
            }

            condensedVault[decryptableProperties[j]] = response.value!;
        }

        return condensedVault;
    }
}

const vaultHelper: VaultHelper = new VaultHelper();
export default vaultHelper;