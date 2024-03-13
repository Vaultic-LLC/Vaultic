import { MethodResponse } from "@renderer/Types/EncryptedData";
import { useUnknownResponsePopup } from "./injectHelper";

export interface CryptHelper
{
	encrypt: (key: string, value: string) => Promise<MethodResponse>;
	decrypt: (key: string, value: string) => Promise<MethodResponse>;
}

async function encrypt(key: string, value: string): Promise<MethodResponse>
{
	const result = await window.api.utilities.crypt.encrypt(key, value);
	if (!result.success)
	{
		//useUnknownResponsePopup()(undefined, result.logID);
	}

	return result;
}

async function decrypt(key: string, value: string): Promise<MethodResponse>
{
	const result = await window.api.utilities.crypt.decrypt(key, value);
	if (!result.success)
	{
		//useUnknownResponsePopup()(undefined, result.logID);
	}

	return result;
}

const cryptHelper: CryptHelper = {
	encrypt,
	decrypt
}

export default cryptHelper;
