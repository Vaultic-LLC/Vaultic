import { IIdentifiable } from "../Types/EncryptedData";
import { v4 as uuidv4 } from 'uuid';

class Generator
{
	constructor() { }

	public uniqueId<T extends IIdentifiable>(existingItems: T[]): string
	{
		let hasDuplicate: boolean = true;
		let id: string = "";

		while (hasDuplicate)
		{
			id = uuidv4();
			hasDuplicate = existingItems.some(i => i.id == id);
		}

		return id;
	}

	public randomValue(length: number): string
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
}

const generator = new Generator();
export default generator;
