import { createHash } from "crypto"
import currentLicense from "../Objects/License";

export interface HashUtility
{
	hash: (value: string) => string;
}

function hash(value: string): string
{
	if (!currentLicense.isValid())
	{
		return "";
	}

	return createHash('sha256').update(value).digest('base64');
}

const hashUtility: HashUtility = {
	hash
};

export default hashUtility;
