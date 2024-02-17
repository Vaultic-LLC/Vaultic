import crypto from "crypto";
import hashUtility from "./HashUtility";

class CryptUtility
{
	ivLength: number;
	authTagLength: number;
	encryptionMethod: crypto.CipherGCMTypes;

	constructor()
	{
		this.ivLength = 12;
		this.authTagLength = 16;
		this.encryptionMethod = 'aes-256-gcm';
	}

	public encrypt(key: string, value: string): string
	{
		const hashedKey: string = hashUtility.hash(key);
		const keyBytes = Buffer.from(hashedKey, 'base64')

		const iv = crypto.randomBytes(this.ivLength);
		const cipher = crypto.createCipheriv(this.encryptionMethod, keyBytes, iv,
			{ 'authTagLength': this.authTagLength });

		const encryptedValue = Buffer.concat([cipher.update(Buffer.from(value).toString("base64"), "base64"), cipher.final()]);

		return Buffer.concat([iv, encryptedValue, cipher.getAuthTag()]).toString("base64");
	}

	// TODO: better error handling. have this return true / false on if the exception was thrown so i know if a blank
	// string is the result of an incorect key or not
	public decrypt(key: string, value: string): string
	{
		try
		{
			const cipher: Buffer = Buffer.from(value, "base64");
			const iv = Uint8Array.prototype.slice.call(cipher, 0, this.ivLength);
			const authTag = Uint8Array.prototype.slice.call(cipher, -this.authTagLength);
			const encryptedValue = Uint8Array.prototype.slice.call(cipher, this.ivLength, -this.authTagLength);

			const hashedKey: string = hashUtility.hash(key);
			const keyBytes = Buffer.from(hashedKey, 'base64')

			const decipher = crypto.createDecipheriv(this.encryptionMethod, keyBytes, iv,
				{ 'authTagLength': this.authTagLength });

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
}

const cryptUtility = new CryptUtility();
export default cryptUtility;
