import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { EncryptedResponse } from "@vaultic/shared/Types/Responses";
import { ClientCryptUtility, ClientGeneratorUtility, PublicPrivateKey } from "@vaultic/shared/Types/Utilities";

export interface CryptUtility extends ClientCryptUtility
{
    encrypt: (key: string, value: string) => Promise<TypedMethodResponse<string>>;
    decrypt: (key: string, value: string) => Promise<TypedMethodResponse<string>>;
    hybridEncrypt: (value: string) => Promise<TypedMethodResponse<EncryptedResponse>>;
    hybridDecrypt: (privateKey: string, encryptedResponse: EncryptedResponse) => Promise<TypedMethodResponse<string>>;
}

export interface GeneratorUtility extends ClientGeneratorUtility
{
    uniqueId: () => string;
    randomValue: (length: number) => string;
    randomValueOfByteLength: (byteLength: number) => string;
    publicPrivateKey: () => PublicPrivateKey;
}