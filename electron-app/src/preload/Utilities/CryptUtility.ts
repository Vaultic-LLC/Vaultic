import crypto from "crypto";
import hashUtility from "./HashUtility";
import vaulticServer from "../Objects/Server/VaulticServer";
import { MethodResponse } from "../Types/MethodResponse";

export interface CryptUtility
{
	encrypt: (key: string, value: string) => Promise<MethodResponse>;
	decrypt: (key: string, value: string) => Promise<MethodResponse>;
}

const ivLength: number = 12;
const authTagLength: number = 16;
const encryptionMethod: crypto.CipherGCMTypes = 'aes-256-gcm';

async function encrypt(key: string, value: string): Promise<MethodResponse>
{
	let logID: number | undefined;
	try
	{
		const hashedKey: string = await hashUtility.hash(key);
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
			const response = await vaulticServer.app.log(error.message, error.stack ?? "");
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
	try
	{
		const cipher: Buffer = Buffer.from(value, "base64");
		const iv = Uint8Array.prototype.slice.call(cipher, 0, ivLength);
		const authTag = Uint8Array.prototype.slice.call(cipher, -authTagLength);
		const encryptedValue = Uint8Array.prototype.slice.call(cipher, ivLength, -authTagLength);
		const hashedKey: string = await hashUtility.hash(key);
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
	}

	return { success: false };
}

const cryptUtility: CryptUtility =
{
	encrypt,
	decrypt
};

export default cryptUtility;
