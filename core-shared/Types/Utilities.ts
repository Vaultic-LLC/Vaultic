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
    generateRandomPasswordOrPassphrase: (type: RandomValueType, length: number, includeNumbers: boolean, includeSpecialCharacters: boolean, includeAbmiguousCharacters: boolean, passphraseSeperator: string) => string;
}

export class ObjectPropertyManager<T extends { [key: string | number]: any }>
{
    keys(obj: T)
    {
        return Object.keys(obj);
    }

    get(key: any, obj: T)
    {
        return obj[key];
    }

    set(key: any, value: any, obj: T)
    {
        obj[key] = value;
    }

    delete(key: any, obj: T)
    {
        delete obj[key];
    }
}

export class MapPropertyManager extends ObjectPropertyManager<Map<any, any>>
{
    keys(obj: Map<any, any>)
    {
        return obj.keyArray();
    }

    get(key: any, obj: Map<any, any>)
    {
        return obj.get(key);
    }

    set(key: any, value: any, obj: Map<any, any>)
    {
        obj.set(key, value)
    }

    delete(key: any, obj: Map<any, any>)
    {
        obj.delete(key);
    }
}