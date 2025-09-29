import { x25519 } from '@noble/curves/ed25519';
import coreGenerator from './CoreGeneratorUtility';
import { environment } from '../Environment';
import { ECEncryptionResult, TypedMethodResponse } from '@vaultic/shared/Types/MethodResponse';
import { ml_kem1024 } from '@noble/post-quantum/ml-kem';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa';
import { PublicPrivateKey, Algorithm, VaulticKey, MLKEM1024KeyResult, SignedVaultKey, AsymmetricVaulticKey } from '@vaultic/shared/Types/Keys';
import { ClientCryptUtility } from '@vaultic/shared/Types/Utilities';
import errorCodes from '@vaultic/shared/Types/ErrorCodes';

export class CoreCryptUtility implements ClientCryptUtility
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

            let randomValues: Uint8Array = this.randomBytes(length);
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
                const encSeed = this.randomBytes(64);
                const encKeys = ml_kem1024.keygen(encSeed);

                return {
                    public: JSON.stringify(
                        {
                            algorithm: Algorithm.ML_KEM_1024,
                            symmetricAlgorithm: Algorithm.XCHACHA20_POLY1305,
                            key: this.bytesToHex(encKeys.publicKey)
                        }),
                    private: JSON.stringify(
                        {
                            algorithm: Algorithm.ML_KEM_1024,
                            symmetricAlgorithm: Algorithm.XCHACHA20_POLY1305,
                            key: this.bytesToHex(encKeys.secretKey)
                        })
                };
            case Algorithm.ML_DSA_87:
                const sigSeed = this.randomBytes(32);
                const sigKeys = ml_dsa87.keygen(sigSeed);

                return {
                    public: JSON.stringify(
                        {
                            algorithm: Algorithm.ML_DSA_87,
                            key: this.bytesToHex(sigKeys.publicKey)
                        }),
                    private: JSON.stringify(
                        {
                            algorithm: Algorithm.ML_DSA_87,
                            key: this.bytesToHex(sigKeys.secretKey)
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

        const key: VaulticKey = 
        {
            algorithm: Algorithm.XCHACHA20_POLY1305,
            key: this.bytesToHex(sharedKey)
        };

        const response = await this.symmetricEncrypt(JSON.stringify(key), value);
        if (!response)
        {
            return TypedMethodResponse.propagateFail(response);
        }

        return TypedMethodResponse.success({ data: response.value, publicKey: tempKeys.public });
    }

    public async ECDecrypt(tempPublicKey: string, usersPrivateKey: string, value: string): Promise<TypedMethodResponse<string>>
    {
        const sharedKey = x25519.getSharedSecret(usersPrivateKey, tempPublicKey);
        const key: VaulticKey = 
        {
            algorithm: Algorithm.XCHACHA20_POLY1305,
            key: this.bytesToHex(sharedKey)
        };

        return await this.symmetricDecrypt(JSON.stringify(key), value);
    }

    public async symmetricEncrypt(key: string, value: string): Promise<TypedMethodResponse<string | undefined>>
    {
        try
        {
            const vaulticKey: VaulticKey = JSON.parse(key);
            switch (vaulticKey.algorithm)
            {
                case Algorithm.XCHACHA20_POLY1305:
                    const keyHash = await environment.utilities.hash.hash(Algorithm.SHA_256, vaulticKey.key);
                    if (!keyHash.success)
                    {
                        return TypedMethodResponse.fail();
                    }

                    return TypedMethodResponse.success(this.xChaChaPoly1305IETFEncrypt(keyHash.value, value));
            }
        }
        catch (e: any)
        {
            await environment.repositories.logs.log(undefined, e.toString(), "Symmetric Encrypt");
        }

        return TypedMethodResponse.fail();
    }

    public async symmetricDecrypt(key: string, value: string): Promise<TypedMethodResponse<string | undefined>>
    {
        try
        {
            const vaulticKey: VaulticKey = JSON.parse(key);
            switch (vaulticKey.algorithm)
            {
                case Algorithm.XCHACHA20_POLY1305:
                    const keyHash = await environment.utilities.hash.hash(Algorithm.SHA_256, vaulticKey.key);
                    if (!keyHash.success)
                    {
                        return TypedMethodResponse.fail();
                    }

                    return TypedMethodResponse.success(this.xChaChaPoly1305IETFDecrypt(keyHash.value, value));
            }
        }
        catch (e: any)
        {
            await environment.repositories.logs.log(undefined, e.toString(), "Symmetric Decrypt");
        }

        // Failed to decrypt. Most of the time this should never happen unless the cipher was tampered with.
        // In that case we want to re fresh all data. The only time we don't want to do that is when checking if the 
        // master key is valid, but we catch this error to prevent refreshing all data
        throw TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED);
    }

    public async asymmeticEncrypt(recipientsPublicEncryptingKey: string, value: string): Promise<TypedMethodResponse<MLKEM1024KeyResult | string | undefined>>
    {
        try
        {
            const vaulticKey: AsymmetricVaulticKey = JSON.parse(recipientsPublicEncryptingKey);
            switch (vaulticKey.algorithm)
            {
                case Algorithm.ML_KEM_1024:
                    const { cipherText, sharedSecret } = ml_kem1024.encapsulate(this.hexToBytes(vaulticKey.key));
                    const symmetricVaulticKey: VaulticKey =
                    {
                        key: this.bytesToHex(sharedSecret),
                        algorithm: vaulticKey.symmetricAlgorithm
                    };

                    const encryptedVaultKey = await this.symmetricEncrypt(JSON.stringify(symmetricVaulticKey), value);
                    if (!encryptedVaultKey.success)
                    {
                        return encryptedVaultKey;
                    }

                    return TypedMethodResponse.success({ cipherText: this.bytesToHex(cipherText), value: encryptedVaultKey.value });
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
            const vaulticKey: AsymmetricVaulticKey = JSON.parse(recipientsPrivateEncryptingKey);
            switch (vaulticKey.algorithm)
            {
                case Algorithm.ML_KEM_1024:
                    const sharedSecret = ml_kem1024.decapsulate(this.hexToBytes(cipherText), this.hexToBytes(vaulticKey.key));
                    const symmetricVaulticKey: VaulticKey =
                    {
                        algorithm: vaulticKey.symmetricAlgorithm,
                        key: this.bytesToHex(sharedSecret)
                    };

                    return environment.utilities.crypt.symmetricDecrypt(JSON.stringify(symmetricVaulticKey), value);
            }
        }
        catch (e)
        {
        }

        return TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED);
    }

    public async sign(sendersPrivateSigningKey: string, message: string): Promise<TypedMethodResponse<string | undefined>>
    {
        try
        {
            const vaulticKey: VaulticKey = JSON.parse(sendersPrivateSigningKey);
            switch (vaulticKey.algorithm)
            {
                case Algorithm.ML_DSA_87:
                    return TypedMethodResponse.success(this.bytesToHex(ml_dsa87.sign(this.hexToBytes(vaulticKey.key), new TextEncoder().encode(message))));
            }
        }
        catch (e) 
        {
            await environment.repositories.logs.log(undefined, "Signin Exception");
        }

        return TypedMethodResponse.fail();
    }

    public async verify(sendersPublicSigningKey: string, signedVaultKey: SignedVaultKey): Promise<TypedMethodResponse<boolean | undefined>>
    {
        try
        {
            const vaulticKey: VaulticKey = JSON.parse(sendersPublicSigningKey);
            switch (vaulticKey.algorithm)
            {
                case Algorithm.ML_DSA_87:
                    return new TypedMethodResponse(ml_dsa87.verify(this.hexToBytes(vaulticKey.key), new TextEncoder().encode(JSON.stringify(signedVaultKey.message)),
                        this.hexToBytes(signedVaultKey.signature)));
            }
        }
        catch (e) 
        {
            await environment.repositories.logs.log(undefined, "Verifying Exception");
        }

        return TypedMethodResponse.fail();
    }

    public randomBytes(length: number): Uint8Array
    {
        throw "Not Implemented";
    }

    public bytesToHex(bytes: Uint8Array): string
    {
        throw "Not Implemented";
    }

    public hexToBytes(hex: string): Uint8Array
    {
        throw "Not Implemented";
    }

    protected xChaChaPoly1305IETFEncrypt(key: string, value: string): string
    {
        throw "Not Implemented";
    }

    protected xChaChaPoly1305IETFDecrypt(key: string, value: string): string
    {
        throw "Not Implemented";
    }
}