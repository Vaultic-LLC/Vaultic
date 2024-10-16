import { x25519 } from '@noble/curves/ed25519';
import { bytesToHex } from '@noble/curves/abstract/utils';
import coreGenerator from './CoreGeneratorUtility';
import { environment } from '../Environment';
import { ECEncryptionResult, MethodResponse } from '@vaultic/shared/Types/MethodResponse';
import { CoreCryptUtility } from '@vaultic/shared/Types/Utilities';

async function ECEncrypt(recipientPublicKey: string, value: string): Promise<ECEncryptionResult>
{
    const tempKeys = await coreGenerator.ECKeys();
    const sharedKey = x25519.getSharedSecret(tempKeys.private, recipientPublicKey);

    const response = await environment.utilities.crypt.encrypt(bytesToHex(sharedKey), value);
    if (!response)
    {
        return response;
    }

    return {
        success: true,
        publicKey: tempKeys.public,
        value: response.value
    }
}

async function ECDecrypt(tempPublicKey: string, usersPrivateKey: string, value: string): Promise<MethodResponse>
{
    const sharedKey = x25519.getSharedSecret(usersPrivateKey, tempPublicKey);
    const response = await environment.utilities.crypt.decrypt(bytesToHex(sharedKey), value);

    if (!response)
    {
        return response;
    }

    return {
        success: true,
        value: response.value
    }
}

const coreCrypt: CoreCryptUtility =
{
    ECEncrypt,
    ECDecrypt
};

export default coreCrypt;
