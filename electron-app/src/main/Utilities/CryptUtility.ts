import crypto from "crypto";
import { CoreCryptUtility } from "../Core/Utilities/CoreCryptUtility";
import { crypto_aead_xchacha20poly1305_ietf_encrypt, crypto_aead_xchacha20poly1305_ietf_decrypt, randombytes_buf, crypto_aead_xchacha20poly1305_ietf_NPUBBYTES, crypto_aead_xchacha20poly1305_ietf_ABYTES } from "sodium-native";

export class CryptUtility extends CoreCryptUtility
{
	public randomBytes(length: number): Uint8Array
	{
		return crypto.randomBytes(length);
	}

	public bytesToHex(bytes: Uint8Array): string
	{
		return Buffer.from(bytes).toString('hex');
	}

	public hexToBytes(hex: string): Uint8Array
	{
		return Buffer.from(hex, 'hex');
	}

	protected xChaChaPoly1305IETFEncrypt(key: string, value: string): string
	{
		const keyBytes = Buffer.from(key, 'hex');
		const messageBuffer = new TextEncoder().encode(value);
		const cipherText = Buffer.alloc(messageBuffer.length + crypto_aead_xchacha20poly1305_ietf_ABYTES);
		const nonce = crypto.randomBytes(crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
		randombytes_buf(nonce);
		crypto_aead_xchacha20poly1305_ietf_encrypt(cipherText, messageBuffer, null, null, nonce, keyBytes);

		return Buffer.concat([nonce, cipherText]).toString("hex");
	}

	protected xChaChaPoly1305IETFDecrypt(key: string, value: string): string
	{
		const keyBytes = Buffer.from(key, 'hex');
		const cipherTextBytes = Buffer.from(value, 'hex');
		const message = Buffer.alloc(cipherTextBytes.length - crypto_aead_xchacha20poly1305_ietf_ABYTES - crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);

		crypto_aead_xchacha20poly1305_ietf_decrypt(message, null, Uint8Array.prototype.slice.call(cipherTextBytes, 24), null,
			Uint8Array.prototype.slice.call(cipherTextBytes, 0, 24), keyBytes);

		return new TextDecoder().decode(message);
	}
}
