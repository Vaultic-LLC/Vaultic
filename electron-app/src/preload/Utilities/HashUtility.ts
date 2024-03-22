import crypto, { createHash } from "crypto"

export interface HashUtility
{
	//hash: (value: string, salt: string) => Promise<string>;
	insecureHash: (value: string) => string;
}

// TODO remove if I no longer need
// async function hash(value: string, salt: string): Promise<string>
// {
// 	return new Promise((resolve, _) =>
// 	{
// 		console.time();
// 		crypto.pbkdf2(value, salt!, 6000000, 32,
// 			'sha256', (err, derivedKey) =>
// 		{
// 			if (err) throw err;
// 			resolve(derivedKey.toString('base64'));
// 			console.timeLog();
// 		});
// 	});
// }

function insecureHash(value: string)
{
	return createHash('sha256').update(value).digest('base64');
}

const hashUtility: HashUtility = {
	//hash,
	insecureHash
};

export default hashUtility;
