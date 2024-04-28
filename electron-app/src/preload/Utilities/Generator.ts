import { v4 as uuidv4 } from 'uuid';
import { randomBytes, generateKeyPairSync, KeyPairSyncResult } from "crypto"

export interface GeneratorUtility
{
	uniqueId: () => string;
	randomValue: (length: number) => string;
	randomValueOfByteLength: (byteLength: number) => string;
	publicPrivateKey: () => KeyPairSyncResult<string, string>;
}

function uniqueId(): string
{
	return uuidv4();
}

function randomValue(length: number): string
{
	let validRandomPassword: boolean = false;
	let validPasswordTest = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
	let randomPassword: string = "";

	const possibleCharacters: string = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+\\-=[\\]{};':\"\\|,.<>/?"
	const possibleCharactersLength: number = possibleCharacters.length;

	while (!validRandomPassword)
	{
		randomPassword = "";

		let randomValues: Uint8Array = new Uint8Array(length);
		crypto.getRandomValues(randomValues);

		randomValues.forEach(v => randomPassword += possibleCharacters[v % possibleCharactersLength]);
		validRandomPassword = validPasswordTest.test(randomPassword);
	}

	return randomPassword;
}

function randomValueOfByteLength(bytes: number)
{
	return randomBytes(bytes).toString('hex');
}

function publicPrivateKey(): KeyPairSyncResult<string, string>
{
	return generateKeyPairSync('rsa', {
		modulusLength: 4096,
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem'
		},
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'pem'
		}
	});
}

const generatorUtility: GeneratorUtility =
{
	uniqueId,
	randomValue,
	randomValueOfByteLength,
	publicPrivateKey
};

export default generatorUtility;
