import crypto from "crypto";
import hashUtility from "./HashUtility";
import vaulticServer from "../Objects/Server/VaulticServer";
import { HybridEncrypionResponse, MethodResponse } from "../Types/MethodResponse";
import generatorUtility from "./Generator";
import { EncryptedResponse } from "../Types/Responses";

export interface CryptUtility
{
	encrypt: (key: string, value: string) => Promise<MethodResponse>;
	decrypt: (key: string, value: string) => Promise<MethodResponse>;
	hybridEncrypt: (publicKey: string, value: string) => Promise<HybridEncrypionResponse>;
	hybridDecrypt: (privateKey: string, encryptedResponse: EncryptedResponse) => Promise<MethodResponse>;
}

const ivLength: number = 12;
const authTagLength: number = 16;
const encryptionMethod: crypto.CipherGCMTypes = 'aes-256-gcm';

async function encrypt(key: string, value: string): Promise<MethodResponse>
{
	let logID: number | undefined;
	try
	{
		const hashedKey: string = hashUtility.insecureHash(key);
		const keyBytes = Buffer.from(hashedKey, 'base64')

		const iv = crypto.randomBytes(ivLength);
		const cipher = crypto.createCipheriv(encryptionMethod, keyBytes, iv,
			{ 'authTagLength': authTagLength });

		const encryptedValue = Buffer.concat([cipher.update(Buffer.from(value).toString("base64"), "base64"), cipher.final()]);
		return { success: true, value: Buffer.concat([iv, encryptedValue, cipher.getAuthTag()]).toString("base64") };
	}
	catch (e: any)
	{
		if (e?.error instanceof Error)
		{
			const error: Error = e?.error as Error;
			const response = await vaulticServer.app.log(error.message, "CryptUtility.Encrypt");
			if (response.success)
			{
				logID = response.LogID;
			}
		}
	}

	return { success: false, logID };
}

async function decrypt(key: string, value: string): Promise<MethodResponse>
{
	let errorMessage: string = "";
	try
	{
		const cipher: Buffer = Buffer.from(value, "base64");
		const iv = Uint8Array.prototype.slice.call(cipher, 0, ivLength);
		const authTag = Uint8Array.prototype.slice.call(cipher, -authTagLength);
		const encryptedValue = Uint8Array.prototype.slice.call(cipher, ivLength, -authTagLength);
		const hashedKey: string = hashUtility.insecureHash(key);
		const keyBytes = Buffer.from(hashedKey, 'base64')

		const decipher = crypto.createDecipheriv(encryptionMethod, keyBytes, iv,
			{ 'authTagLength': authTagLength });

		decipher.setAuthTag(authTag);

		let decryptedValue = decipher.update(encryptedValue);
		decryptedValue = Buffer.concat([decryptedValue, decipher.final()]);

		return { success: true, value: Buffer.from(decryptedValue).toString("ascii") };
	}
	catch (e: any)
	{
		// don't want to log here since everytime a user enters the wrong key an exception is thrown
		if (e?.error instanceof Error)
		{
			const error: Error = e?.error as Error;
			errorMessage = error.message;
		}
	}

	return { success: false, errorMessage: errorMessage };
}

async function hybridEncrypt(publicKey: string, value: string): Promise<HybridEncrypionResponse>
{
	let logID: number | undefined;

	try
	{
		const aesKey = generatorUtility.randomValueOfByteLength(32);
		const aesResult = await encrypt(aesKey, value);
		if (!aesResult.success)
		{
			return aesResult;
		}

		const keyBytes = Buffer.from(aesKey);
		const encryptedKey = crypto.publicEncrypt(publicKey, keyBytes).toString("base64");

		return { success: true, key: encryptedKey, value: aesResult.value };
	}
	catch (e: any)
	{
		if (e?.error instanceof Error)
		{
			const error: Error = e?.error as Error;
			const response = await vaulticServer.app.log(error.message, "CryptUtility.Encrypt");
			if (response.success)
			{
				logID = response.LogID;
			}
		}
	}

	return { success: false, logID: logID }
}

async function hybridDecrypt(privateKey: string, encryptedResponse: EncryptedResponse): Promise<MethodResponse>
{
	let logID: number | undefined;

	try
	{
		const encryptedSymmetricKey = Buffer.from(encryptedResponse.key!, "base64");
		const symmetricKey = crypto.privateDecrypt({
			key: privateKey,
			padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
		}, encryptedSymmetricKey).toString("ascii");

		const response = await decrypt(symmetricKey, encryptedResponse.data!);
		if (!response.success)
		{
			const logResponse = await vaulticServer.app.log(response.errorMessage ?? "Error while decrypting",
				"CryptUtility.HybridDecrypt");
			if (logResponse.success)
			{
				logID = logResponse.LogID;
			}
		}

		return response;
	}
	catch (e: any)
	{
		if (e?.error instanceof Error)
		{
			const error: Error = e?.error as Error;
			const response = await vaulticServer.app.log(error.message, "CryptUtility.Encrypt");
			if (response.success)
			{
				logID = response.LogID;
			}
		}
	}

	return { success: false, logID: logID }
}

const cryptUtility: CryptUtility =
{
	encrypt,
	decrypt,
	hybridEncrypt,
	hybridDecrypt
};

export default cryptUtility;
