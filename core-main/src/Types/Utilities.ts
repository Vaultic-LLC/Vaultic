import { ECEncryptionResult, HybridEncrypionResponse, MethodResponse, TypedMethodResponse } from "./MethodResponse";
import { EncryptedResponse } from "./Responses";

export interface CoreCryptUtility
{
    ECEncrypt: (recipientPublicKey: string, value: string) => Promise<ECEncryptionResult>;
    ECDecrypt: (tempPublicKey: string, usersPrivateKey: string, value: string) => Promise<MethodResponse>;
}

export interface CryptUtility extends CoreCryptUtility
{
    encrypt: (key: string, value: string) => Promise<MethodResponse>;
    decrypt: (key: string, value: string) => Promise<MethodResponse>;
    hybridEncrypt: (value: string) => Promise<TypedMethodResponse<EncryptedResponse>>;
    hybridDecrypt: (privateKey: string, encryptedResponse: EncryptedResponse) => Promise<MethodResponse>;
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

export interface GeneratorUtility extends CoreGeneratorUtility
{
    uniqueId: () => string;
    randomValue: (length: number) => string;
    randomPassword: (length: number) => string;
    randomValueOfByteLength: (byteLength: number) => string;
    publicPrivateKey: () => PublicPrivateKey;
}

export interface HashUtility
{
    hash: (value: string, salt: string) => Promise<string>;
    insecureHash: (value: string) => string;
    compareHashes: (a: string, b: string) => boolean;
}
