import { HybridEncrypionResponse, MethodResponse } from "./MethodResponse";
import { EncryptedResponse } from "./Responses";

export interface CryptUtility
{
	encrypt: (key: string, value: string) => Promise<MethodResponse>;
	decrypt: (key: string, value: string) => Promise<MethodResponse>;
	hybridEncrypt: (value: string) => Promise<HybridEncrypionResponse>;
	hybridDecrypt: (privateKey: string, encryptedResponse: EncryptedResponse) => Promise<MethodResponse>;
}

export interface PublicPrivateKey
{
	public: string;
	private: string;
}

export interface GeneratorUtility
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
