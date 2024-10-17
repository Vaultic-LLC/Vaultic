import { x25519 } from '@noble/curves/ed25519';
import { bytesToHex } from '@noble/curves/abstract/utils';
import coreGenerator from './CoreGeneratorUtility';
import { environment } from '../Environment';
import { ECEncryptionResult, TypedMethodResponse } from '@vaultic/shared/Types/MethodResponse';
import { CoreCryptUtility } from '@vaultic/shared/Types/Utilities';

async function ECEncrypt(recipientPublicKey: string, value: string): Promise<TypedMethodResponse<ECEncryptionResult>>
{
    const tempKeys = await coreGenerator.ECKeys();
    const sharedKey = x25519.getSharedSecret(tempKeys.private, recipientPublicKey);

    const response = await environment.utilities.crypt.encrypt(bytesToHex(sharedKey), value);
    if (!response)
    {
        return TypedMethodResponse.propagateFail(response);
    }

    return TypedMethodResponse.success({ data: response.value, publicKey: tempKeys.public });
}

async function ECDecrypt(tempPublicKey: string, usersPrivateKey: string, value: string): Promise<TypedMethodResponse<string>>
{
    const sharedKey = x25519.getSharedSecret(usersPrivateKey, tempPublicKey);
    return await environment.utilities.crypt.decrypt(bytesToHex(sharedKey), value);
}

const coreCrypt: CoreCryptUtility =
{
    ECEncrypt,
    ECDecrypt
};

export default coreCrypt;
