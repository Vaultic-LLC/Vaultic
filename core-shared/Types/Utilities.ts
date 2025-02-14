import { RandomValueType } from "./Fields";
import { PublicPrivateKey } from "./Keys";
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

export interface CoreGeneratorUtility
{
    ECKeys: () => Promise<PublicPrivateKey<string>>;
}

export interface ClientGeneratorUtility extends CoreGeneratorUtility
{
    uniqueId: () => string;
    randomValue: (length: number) => string;
    generateRandomPasswordOrPassphrase: (type: RandomValueType, length: number, includeNumbers: boolean, includeSpecialCharacters: boolean, includeAbmiguousCharacters: boolean, passphraseSeperator: string) => string;
}

export interface HashUtility
{
    hash: (value: string, salt: string) => Promise<string>;
    insecureHash: (value: string) => string;
    compareHashes: (a: string, b: string) => boolean;
}
