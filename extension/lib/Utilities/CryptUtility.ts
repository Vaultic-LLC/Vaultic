import { from_hex, to_hex, crypto_aead_xchacha20poly1305_ietf_encrypt, crypto_aead_xchacha20poly1305_ietf_decrypt, crypto_aead_xchacha20poly1305_ietf_NPUBBYTES } from "libsodium-wrappers-sumo";
import { CoreCryptUtility } from "../Main/Utilities/CoreCryptUtility";

export class CryptUtility extends CoreCryptUtility
{
	public randomBytes(length: number): Uint8Array
	{
        const bytes = new Uint8Array(length);
		return crypto.getRandomValues(bytes);
	}

	public bytesToHex(bytes: Uint8Array): string
	{
        return to_hex(bytes);
	}

	public hexToBytes(hex: string): Uint8Array
	{
        return from_hex(hex);
	}

	protected xChaChaPoly1305IETFEncrypt(key: string, value: string): string
	{
		const keyBytes = from_hex(key);
		const messageBuffer = new TextEncoder().encode(value);
		const nonce = new Uint8Array(crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
        crypto.getRandomValues(nonce);

		const cipherText = crypto_aead_xchacha20poly1305_ietf_encrypt(messageBuffer, null, null, nonce, keyBytes);
        return to_hex(new Uint8Array([...nonce, ...cipherText]));
	}

	protected xChaChaPoly1305IETFDecrypt(key: string, value: string): string
	{
		const keyBytes = from_hex(key);
		const cipherTextBytes = from_hex(value);

		const message = crypto_aead_xchacha20poly1305_ietf_decrypt(null, Uint8Array.prototype.slice.call(cipherTextBytes, 24), null,
			Uint8Array.prototype.slice.call(cipherTextBytes, 0, 24), keyBytes);

		return new TextDecoder().decode(message);
	}
}
