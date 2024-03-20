import crypto from "crypto"

export interface HashUtility
{
	hash: (value: string, salt?: string) => Promise<string>;
}

const defaultSalt: string = "a;lfasl;fjklavnaklsfhsadkfhsaklfsaflasdknvasdklfwefhw;IFKSNVKLASDJNVH234]21O51[2[2112[24215";

async function hash(value: string, salt?: string): Promise<string>
{
	if (!salt)
	{
		salt = defaultSalt;
	}

	return new Promise((resolve, _) =>
	{
		console.time();
		crypto.pbkdf2(value, salt!, 6000000, 32,
			'sha256', (err, derivedKey) =>
		{
			if (err) throw err;
			resolve(derivedKey.toString('base64'));
			console.timeLog();
		});
	});
}

const hashUtility: HashUtility = {
	hash
};

export default hashUtility;
