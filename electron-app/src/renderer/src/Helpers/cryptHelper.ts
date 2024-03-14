import { MethodResponse } from "@renderer/Types/EncryptedData";
import { stores } from "@renderer/Objects/Stores";

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
		stores.popupStore.showError(result.logID);
	}

	return result;
}

async function decrypt(key: string, value: string): Promise<MethodResponse>
{
	// This is expected to fail if the user enters the wrong key, don't show the error popup
	return await window.api.utilities.crypt.decrypt(key, value);
}

const cryptHelper: CryptHelper = {
	encrypt,
	decrypt
}

export default cryptHelper;
