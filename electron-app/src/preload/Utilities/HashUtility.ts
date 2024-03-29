import crypto, { createHash } from "crypto"

export interface HashUtility
{
	hash: (value: string, salt: string) => Promise<string>;
	insecureHash: (value: string) => string;
}

async function hash(value: string, salt: string): Promise<string>
{
	return new Promise((resolve, _) =>
	{
		crypto.pbkdf2(value, salt!, 5900000, 32,
			'sha256', (err, derivedKey) =>
		{
			if (err) throw err;
			resolve(derivedKey.toString('base64'));
		});
	});
}

function insecureHash(value: string)
{
	return createHash('sha256').update(value).digest('base64');
}

const hashUtility: HashUtility = {
	hash,
	insecureHash
};

export default hashUtility;
