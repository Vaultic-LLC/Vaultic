import crypto from "crypto"
import currentLicense from "../Objects/License";

export interface HashUtility
{
	hash: (value: string, salt?: string) => Promise<string>;
}

const defaultSalt: string = "a;lfasl;fjklavnaklsfhsadkfhsaklfsaflasdknvasdklfwefhw;IFKSNVKLASDJNVH234]21O51[2[2112[24215";

export async function internalHash(value: string, salt?: string): Promise<string>
{
	if (!salt)
	{
		salt = defaultSalt;
	}

	return new Promise((resolve, _) =>
	{
		crypto.pbkdf2(value, salt!, 600000, 32,
			'sha256', (err, derivedKey) =>
		{
			if (err) throw err;
			resolve(derivedKey.toString('base64'));
		});
	});

	//return createHash('sha256').update(salt + value).digest('base64');
}

async function hash(value: string, salt?: string): Promise<string>
{
	// if (!currentLicense.isValid())
	// {
	// 	return "";
	// }
	return internalHash(value, salt);
}

const hashUtility: HashUtility = {
	hash
};

export default hashUtility;
