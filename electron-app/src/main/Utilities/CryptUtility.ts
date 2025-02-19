import crypto from "crypto";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { EncryptedResponse } from "@vaultic/shared/Types/Responses";
import { environment } from "../Core/Environment";
import { CryptUtility } from "../Core/Utilities/CoreCryptUtility";

const vaulticPublicKey = "-----BEGIN RSA PUBLIC KEY-----\nMIICCgKCAgEAoHTMLCg0A3Mr3GIxF/xcPhCDDcp/4OG5wox8bUsWIXExtFKJmLew\nswVRFUxRhUtgyz4O+auJmiDvEgaFHVw4KQ3Fve3K9wjbQ0N51tqTipyj/DMrrJHu\nlUx2cB6JZhgHRiUQb3o+Bhu4CQ6HZd/8QDILAHMtH7eTcx0h6cA4azAWy/1xnc+G\nv71imLyGhRg/FnR3YoegkIuOSRSK9rjBsrw7k7M8Asp0A3FZSRL/Cs82SkadVcEA\nc8VcWEnf9Bdc/exArIgV0H6jA0exPteJK+mts4u8/L0drxMSnXaRYJf8vPckz8M2\n1BuaugZ8uY7ZAVtqB4QQ3C9kZ/0kuYSNE7Dg/oaTWnylOqPQX5Yr/xwU1/QaK7nA\nyrXlVajJhUB+b5QK0L4invuMWarq6bddOldaC4yqMmum+SCLZzEkiYE0CSFX5XIB\nGVI9O3RDdZrt0wx1fsIGCGNBWhinsqxtPw96P9MC1KMGgNIdw/Fc2nFV4NbuwmDM\n3/1X0MJXNt1y22YkFJfXXDmJJuC9naxeK/etasy5uDEpCDxOG6Kww+L54UJmr0o3\neZw7aRcDXrvrDXaalWFHV/JMSxzivTpBeD1MdcBK53JMrZEOuslvWYqo8MapdKfl\na76OBNLXIv4t3E4ARbw7oqkXN9wbn0JZ0PkEjoSKp0aDq/fiNObO3vkCAwEAAQ==\n-----END RSA PUBLIC KEY-----";
const cryptUtility = new CryptUtility();

// TODO: remove
async function hybridEncrypt(value: string): Promise<TypedMethodResponse<EncryptedResponse>>
{
	let logID: number | undefined;

	try
	{
		const key = cryptUtility.generateSymmetricKey();
		const stringKey = JSON.vaulticStringify(key);

		const encryptresult = await cryptUtility.symmetricEncrypt(stringKey, value);
		if (!encryptresult.success)
		{
			return TypedMethodResponse.fail();
		}

		const keyBytes = Buffer.from(stringKey);
		const encryptedKey = crypto.publicEncrypt(vaulticPublicKey, keyBytes).toString("base64");

		return TypedMethodResponse.success({ Key: encryptedKey, Data: encryptresult.value });
	}
	catch (e: any)
	{
		if (e?.error instanceof Error)
		{
			const error: Error = e?.error as Error;
			await environment.repositories.logs.log(undefined, error.message, "CryptUtility.HybridEncrypt");
		}
	}

	return TypedMethodResponse.fail(undefined, undefined, undefined, logID);
}

async function hybridDecrypt(privateKey: string, encryptedResponse: EncryptedResponse): Promise<TypedMethodResponse<string | undefined>>
{
	let logID: number | undefined;

	try
	{
		const encryptedSymmetricKey = Buffer.from(encryptedResponse.Key!, "base64");
		const symmetricKey = crypto.privateDecrypt({
			key: privateKey,
			padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
		}, encryptedSymmetricKey).toString("ascii");

		const response = await cryptUtility.symmetricDecrypt(symmetricKey, encryptedResponse.Data!);
		if (!response.success)
		{
			await environment.repositories.logs.log(undefined, response.errorMessage, "CryptUtility.HybridDecrypt");
		}

		return response;
	}
	catch (e: any)
	{
		if (e?.error instanceof Error)
		{
			const error: Error = e?.error as Error;
			await environment.repositories.logs.log(undefined, error.message, "CryptUtility.HybridDecrypt");
		}
	}

	return TypedMethodResponse.fail(undefined, undefined, undefined, logID);
}

cryptUtility.hybridEncrypt = hybridEncrypt;
cryptUtility.hybridDecrypt = hybridDecrypt;

export default cryptUtility;
