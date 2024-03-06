import { createHash } from "crypto"
import currentLicense from "../Objects/License";

export interface HashUtility
{
	hash: (value: string) => string;
}

const salt: string = "a;lfasl;fjklavnaklsfhsadkfhsaklfsaflasdknvasdklfwefhw;IFKSNVKLASDJNVH234]21O51[2[2112[24215";

export function internalHash(value: string): string
{
	return createHash('sha256').update(salt + value).digest('base64');
}

function hash(value: string): string
{
	if (!currentLicense.isValid())
	{
		return "";
	}

	return internalHash(value);
}

const hashUtility: HashUtility = {
	hash
};

export default hashUtility;
