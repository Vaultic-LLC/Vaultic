import { ECEncryptionResult, TypedMethodResponse } from "./MethodResponse";

export interface CoreCryptUtility
{
    ECEncrypt: (recipientPublicKey: string, value: string) => Promise<TypedMethodResponse<ECEncryptionResult>>;
    ECDecrypt: (tempPublicKey: string, usersPrivateKey: string, value: string) => Promise<TypedMethodResponse<string>>;
}

export interface ClientCryptUtility extends CoreCryptUtility
{
    encrypt: (key: string, value: string) => Promise<TypedMethodResponse<string>>;
    decrypt: (key: string, value: string) => Promise<TypedMethodResponse<string>>;
}

export interface PublicPrivateKey
{
    public: string;
    private: string;
}

export interface CoreGeneratorUtility
{
    ECKeys: () => Promise<PublicPrivateKey>;
}

export interface ClientGeneratorUtility extends CoreGeneratorUtility
{
    uniqueId: () => string;
    randomValue: (length: number) => string;
    randomPassword: (length: number) => string;
}

export interface HashUtility
{
    hash: (value: string, salt: string) => Promise<string>;
    insecureHash: (value: string) => string;
    compareHashes: (a: string, b: string) => boolean;
}
