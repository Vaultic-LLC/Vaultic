import { RandomValueType } from "./Fields";
import { Algorithm, PublicPrivateKey } from "./Keys";
import { ECEncryptionResult, TypedMethodResponse } from "./MethodResponse";

export interface CoreCryptUtility
{
    ECEncrypt: (recipientPublicKey: string, value: string) => Promise<TypedMethodResponse<ECEncryptionResult>>;
    ECDecrypt: (tempPublicKey: string, usersPrivateKey: string, value: string) => Promise<TypedMethodResponse<string>>;
}

export interface ClientCryptUtility extends CoreCryptUtility
{
    symmetricEncrypt: (key: string, value: string) => Promise<TypedMethodResponse<string | undefined>>;
    symmetricDecrypt: (key: string, value: string) => Promise<TypedMethodResponse<string | undefined>>;
}

export interface ClientHashUtility
{
    hash: (algorithm: Algorithm, value: string, salt?: string) => Promise<TypedMethodResponse<string | undefined>>;
}

export interface CoreGeneratorUtility
{
    ECKeys: () => Promise<PublicPrivateKey<string>>;
}

export interface ClientGeneratorUtility extends CoreGeneratorUtility
{
    uniqueId: () => string;
    generateRandomPasswordOrPassphrase: (type: RandomValueType, length: number, includeNumbers: boolean, includeSpecialCharacters: boolean, includeAbmiguousCharacters: boolean, passphraseSeperator: string) => string;
}