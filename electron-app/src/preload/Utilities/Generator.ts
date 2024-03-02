import { v4 as uuidv4 } from 'uuid';
import currentLicense from '../Objects/License';

export interface GeneratorUtility
{
	uniqueId: () => string;
	randomValue: (length: number) => string;
}

function uniqueId(): string
{
	if (!currentLicense.isValid())
	{
		return "";
	}

	return uuidv4();
}

function randomValue(length: number): string
{
	if (!currentLicense.isValid())
	{
		return "";
	}

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

const generatorUtility: GeneratorUtility =
{
	uniqueId,
	randomValue
};

export default generatorUtility;
