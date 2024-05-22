import crypto, { createHash } from "crypto"

export interface HashUtility
{
	hash: (value: string, salt: string) => Promise<string>;
	insecureHash: (value: string) => string;
	compareHashes: (a: string, b: string) => boolean;
}

async function hash(value: string, salt: string): Promise<string>
{
	return new Promise((resolve, _) =>
	{
		crypto.pbkdf2(value, salt!, 1000000, 32,
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

function compareHashes(a: string, b: string): boolean
{
	const aBytes = Buffer.from(a, 'base64');
	const bBytes = Buffer.from(b, 'base64');

	let equal = 0;
	for (let i = 0; i < aBytes.length; i++)
	{
		equal |= (aBytes[i] ^ bBytes[i]);
	}

	return equal == 0;
}

const hashUtility: HashUtility = {
	hash,
	insecureHash,
	compareHashes
};

export default hashUtility;
