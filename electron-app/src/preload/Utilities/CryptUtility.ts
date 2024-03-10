import crypto from "crypto";
import hashUtility from "./HashUtility";

export interface CryptUtility
{
	encrypt: (key: string, value: string) => Promise<string>;
	decrypt: (key: string, value: string) => Promise<string>;
}

const ivLength: number = 12;
const authTagLength: number = 16;
const encryptionMethod: crypto.CipherGCMTypes = 'aes-256-gcm';

// TODO: THIS WILL OVERWRITE EVERYONES DATA TO EMPTY STRINGS IF THEY DON'T HAVE A LICENSE, WHILE SYNCING. SHOULD UPDATE TO RETURN AN ERROR
async function encrypt(key: string, value: string): Promise<string>
{
	try
	{
		const hashedKey: string = await hashUtility.hash(key);
		const keyBytes = Buffer.from(hashedKey, 'base64')

		const iv = crypto.randomBytes(ivLength);
		const cipher = crypto.createCipheriv(encryptionMethod, keyBytes, iv,
			{ 'authTagLength': authTagLength });

		const encryptedValue = Buffer.concat([cipher.update(Buffer.from(value).toString("base64"), "base64"), cipher.final()]);
		return Buffer.concat([iv, encryptedValue, cipher.getAuthTag()]).toString("base64");
	}
	catch (e)
	{
	}

	return "";
}

// TODO: better error handling. have this return true / false on if the exception was thrown so i know if a blank
// string is the result of an incorect key or not
async function decrypt(key: string, value: string): Promise<string>
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

		return Buffer.from(decryptedValue).toString("ascii");
	}
	catch (e: any)
	{
		return "";
	}
}

const cryptUtility: CryptUtility =
{
	encrypt,
	decrypt
};

export default cryptUtility;
