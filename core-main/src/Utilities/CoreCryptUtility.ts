import { x25519 } from '@noble/curves/ed25519';
import { bytesToHex, hexToBytes } from '@noble/curves/abstract/utils';
import coreGenerator from './CoreGeneratorUtility';
import { environment } from '../Environment';
import { ECEncryptionResult, TypedMethodResponse } from '@vaultic/shared/Types/MethodResponse';
import { randomBytes } from '@noble/post-quantum/utils';
import { ml_kem1024 } from '@noble/post-quantum/ml-kem';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa';
import { PublicPrivateKey, Algorithm, VaulticKey, MLKEM1024KeyResult, SignedVaultKey } from '@vaultic/shared/Types/Keys';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { EncryptedResponse } from '@vaultic/shared/Types/Responses';
import { ClientCryptUtility } from '@vaultic/shared/Types/Utilities';

export class CryptUtility implements ClientCryptUtility
{
    constructor() { }

    public randomStrongValue(length: number): string
    {
        let validRandomPassword: boolean = false;
        let validPasswordTest = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
        let randomPassword: string = "";

        const possibleCharacters: string = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+\\-=[\\]{};':\"\\|,.<>/?"
        const possibleCharactersLength: number = possibleCharacters.length;

        while (!validRandomPassword)
        {
            randomPassword = "";

            let randomValues: Uint8Array = randomBytes(length);
            randomValues.forEach(v => randomPassword += possibleCharacters[v % possibleCharactersLength]);
            validRandomPassword = validPasswordTest.test(randomPassword);
        }

        return randomPassword;
    }

    public generatePublicPrivateKeys(alg: Algorithm): PublicPrivateKey<string> | undefined
    {
        switch (alg)
        {
            case Algorithm.ML_KEM_1024:
                const encSeed = randomBytes(64);
                const encKeys = ml_kem1024.keygen(encSeed);

                return {
                    public: JSON.vaulticStringify(
                        {
                            algorithm: Algorithm.ML_KEM_1024,
                            key: bytesToHex(encKeys.publicKey)
                        }),
                    private: JSON.vaulticStringify(
                        {
                            algorithm: Algorithm.ML_KEM_1024,
                            key: bytesToHex(encKeys.secretKey)
                        })
                };
            case Algorithm.ML_DSA_87:
                const sigSeed = randomBytes(32);
                const sigKeys = ml_dsa87.keygen(sigSeed);

                return {
                    public: JSON.vaulticStringify(
                        {
                            algorithm: Algorithm.ML_DSA_87,
                            key: bytesToHex(sigKeys.publicKey)
                        }),
                    private: JSON.vaulticStringify(
                        {
                            algorithm: Algorithm.ML_DSA_87,
                            key: bytesToHex(sigKeys.secretKey)
                        })
                };
        }
    }

    public generateSymmetricKey(): VaulticKey 
    {
        const key = this.randomStrongValue(60);
        return {
            algorithm: Algorithm.XCHACHA20_POLY1305,
            key: key
        };
    }

    public async ECEncrypt(recipientPublicKey: string, value: string): Promise<TypedMethodResponse<ECEncryptionResult>>
    {
        const tempKeys = await coreGenerator.ECKeys();
        const sharedKey = x25519.getSharedSecret(tempKeys.private, recipientPublicKey);

        const response = await this.symmetricEncrypt(bytesToHex(sharedKey), value);
        if (!response)
        {
            return TypedMethodResponse.propagateFail(response);
        }

        return TypedMethodResponse.success({ data: response.value, publicKey: tempKeys.public });
    }

    public async ECDecrypt(tempPublicKey: string, usersPrivateKey: string, value: string): Promise<TypedMethodResponse<string>>
    {
        const sharedKey = x25519.getSharedSecret(usersPrivateKey, tempPublicKey);
        return await this.symmetricDecrypt(bytesToHex(sharedKey), value);
    }

    public async symmetricEncrypt(key: string, value: string): Promise<TypedMethodResponse<string | undefined>>
    {
        try
        {
            const vaulticKey: VaulticKey = JSON.vaulticParse(key);
            switch (vaulticKey.algorithm)
            {
                case Algorithm.XCHACHA20_POLY1305:
                    const keyHash = await environment.utilities.hash.hash(Algorithm.SHA_256, vaulticKey.key);
                    if (!keyHash.success)
                    {
                        return TypedMethodResponse.fail();
                    }

                    const nonce = randomBytes(24);
                    const cipher = xchacha20poly1305(hexToBytes(keyHash.value), nonce).encrypt(new TextEncoder().encode(value));
                    return TypedMethodResponse.success(bytesToHex(new Uint8Array([...nonce, ...cipher])));
            }
        }
        catch (e: any)
        {
            await environment.repositories.logs.log(undefined, e.toString());
        }

        return TypedMethodResponse.fail();
    }

    public async symmetricDecrypt(key: string, value: string): Promise<TypedMethodResponse<string | undefined>>
    {
        try
        {
            const vaulticKey: VaulticKey = JSON.vaulticParse(key);
            switch (vaulticKey.algorithm)
            {
                case Algorithm.XCHACHA20_POLY1305:
                    const keyHash = await environment.utilities.hash.hash(Algorithm.SHA_256, vaulticKey.key);
                    if (!keyHash.success)
                    {
                        return TypedMethodResponse.fail();
                    }

                    const cipherBytes = hexToBytes(value);
                    const chacha = xchacha20poly1305(hexToBytes(keyHash.value), cipherBytes.slice(0, 24));
                    return TypedMethodResponse.success(new TextDecoder().decode(chacha.decrypt(cipherBytes.slice(24))));
            }
        }
        catch (e: any)
        {
            await environment.repositories.logs.log(undefined, e.toString());
        }

        return TypedMethodResponse.fail();
    }

    public async asymmeticEncrypt(recipientsPublicEncryptingKey: string, value: string): Promise<TypedMethodResponse<MLKEM1024KeyResult | string | undefined>>
    {
        try
        {
            const vaulticKey: VaulticKey = JSON.vaulticParse(recipientsPublicEncryptingKey);
            switch (vaulticKey.algorithm)
            {
                case Algorithm.ML_KEM_1024:
                    const { cipherText, sharedSecret } = ml_kem1024.encapsulate(hexToBytes(vaulticKey.key));
                    const encryptedVaultKey = await this.symmetricEncrypt(bytesToHex(sharedSecret), value);

                    if (!encryptedVaultKey.success)
                    {
                        return encryptedVaultKey;
                    }

                    return TypedMethodResponse.success({ cipherText: bytesToHex(cipherText), value: encryptedVaultKey.value });
            }
        }
        catch (e)
        {
        }

        return TypedMethodResponse.fail();
    }

    public async asymmetricDecrypt(recipientsPrivateEncryptingKey: string, value: string, cipherText: string): Promise<TypedMethodResponse<string | undefined>>
    {
        try
        {
            const vaulticKey: VaulticKey = JSON.vaulticParse(recipientsPrivateEncryptingKey);
            switch (vaulticKey.algorithm)
            {
                case Algorithm.ML_KEM_1024:
                    const sharedSecret = ml_kem1024.decapsulate(hexToBytes(cipherText), hexToBytes(vaulticKey.key));
                    return environment.utilities.crypt.symmetricDecrypt(bytesToHex(sharedSecret), value);
            }
        }
        catch (e)
        {
        }

        return TypedMethodResponse.fail();
    }

    public async sign(sendersPrivateSigningKey: string, message: string): Promise<TypedMethodResponse<string | undefined>>
    {
        try
        {
            const vaulticKey: VaulticKey = JSON.vaulticParse(sendersPrivateSigningKey);
            switch (vaulticKey.algorithm)
            {
                case Algorithm.ML_DSA_87:
                    return TypedMethodResponse.success(bytesToHex(ml_dsa87.sign(hexToBytes(vaulticKey.key), new TextEncoder().encode(message))));
            }
        }
        catch (e)
        {
        }

        return TypedMethodResponse.fail();
    }

    public async verify(sendersPublicSigningKey: string, signedVaultKey: SignedVaultKey): Promise<TypedMethodResponse<boolean | undefined>>
    {
        try
        {
            const vaulticKey: VaulticKey = JSON.vaulticParse(sendersPublicSigningKey);
            switch (vaulticKey.algorithm)
            {
                case Algorithm.ML_DSA_87:
                    return new TypedMethodResponse(ml_dsa87.verify(hexToBytes(sendersPublicSigningKey), new TextEncoder().encode(JSON.vaulticStringify(signedVaultKey.message)),
                        hexToBytes(signedVaultKey.signature)));
            }
        }
        catch (e)
        {
        }

        return TypedMethodResponse.fail();
    }

    public async hybridEncrypt(value: string): Promise<TypedMethodResponse<EncryptedResponse>>
    {
        return TypedMethodResponse.fail();
    }

    public async hybridDecrypt(privateKey: string, encryptedResponse: EncryptedResponse): Promise<TypedMethodResponse<string | undefined>>
    {
        return TypedMethodResponse.fail();
    }
}