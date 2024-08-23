import crypto from "crypto";
import hashUtility from "./HashUtility";
import vaulticServer from "../Core/Server/VaulticServer";
import { HybridEncrypionResponse, MethodResponse } from "../Core/Types/MethodResponse";
import generatorUtility from "./Generator";
import { EncryptedResponse } from "../Core/Types/Responses";
import { CryptUtility, PublicPrivateKey } from "../Core/Types/Utilities";
import coreCrypt from "../Core/Utilities/CoreCryptUtility";

const vaulticPublicKey = "-----BEGIN RSA PUBLIC KEY-----\nMIICCgKCAgEAoHTMLCg0A3Mr3GIxF/xcPhCDDcp/4OG5wox8bUsWIXExtFKJmLew\nswVRFUxRhUtgyz4O+auJmiDvEgaFHVw4KQ3Fve3K9wjbQ0N51tqTipyj/DMrrJHu\nlUx2cB6JZhgHRiUQb3o+Bhu4CQ6HZd/8QDILAHMtH7eTcx0h6cA4azAWy/1xnc+G\nv71imLyGhRg/FnR3YoegkIuOSRSK9rjBsrw7k7M8Asp0A3FZSRL/Cs82SkadVcEA\nc8VcWEnf9Bdc/exArIgV0H6jA0exPteJK+mts4u8/L0drxMSnXaRYJf8vPckz8M2\n1BuaugZ8uY7ZAVtqB4QQ3C9kZ/0kuYSNE7Dg/oaTWnylOqPQX5Yr/xwU1/QaK7nA\nyrXlVajJhUB+b5QK0L4invuMWarq6bddOldaC4yqMmum+SCLZzEkiYE0CSFX5XIB\nGVI9O3RDdZrt0wx1fsIGCGNBWhinsqxtPw96P9MC1KMGgNIdw/Fc2nFV4NbuwmDM\n3/1X0MJXNt1y22YkFJfXXDmJJuC9naxeK/etasy5uDEpCDxOG6Kww+L54UJmr0o3\neZw7aRcDXrvrDXaalWFHV/JMSxzivTpBeD1MdcBK53JMrZEOuslvWYqo8MapdKfl\na76OBNLXIv4t3E4ARbw7oqkXN9wbn0JZ0PkEjoSKp0aDq/fiNObO3vkCAwEAAQ==\n-----END RSA PUBLIC KEY-----";

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
			if (response.Success)
			{
				logID = response.LogID;
			}
		}

		return { success: false, errorMessage: `Encryption Error: ${JSON.stringify(e)}` };
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

async function hybridEncrypt(value: string): Promise<HybridEncrypionResponse>
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
		const encryptedKey = crypto.publicEncrypt(vaulticPublicKey, keyBytes).toString("base64");

		return { success: true, key: encryptedKey, value: aesResult.value };
	}
	catch (e: any)
	{
		if (e?.error instanceof Error)
		{
			const error: Error = e?.error as Error;
			const response = await vaulticServer.app.log(error.message, "CryptUtility.Encrypt");
			if (response.Success)
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
		const encryptedSymmetricKey = Buffer.from(encryptedResponse.Key!, "base64");
		const symmetricKey = crypto.privateDecrypt({
			key: privateKey,
			padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
		}, encryptedSymmetricKey).toString("ascii");

		const response = await decrypt(symmetricKey, encryptedResponse.Data!);
		if (!response.success)
		{
			const logResponse = await vaulticServer.app.log(response.errorMessage ?? "Error while decrypting",
				"CryptUtility.HybridDecrypt");
			if (logResponse.Success)
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
			if (response.Success)
			{
				logID = response.LogID;
			}
		}
	}

	return { success: false, logID: logID }
}

function generateECKeys(): PublicPrivateKey
{
	const { privateKey, publicKey } = crypto.generateKeyPairSync('x25519', {
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem',
		},
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'pem',
		},
	});

	return {
		public: publicKey,
		private: privateKey
	};
}

const cryptUtility: CryptUtility =
{
	...coreCrypt,
	encrypt,
	decrypt,
	hybridEncrypt,
	hybridDecrypt,
};

export default cryptUtility;
