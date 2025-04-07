import { CoreHashUtility } from "../Core/Utilities/CoreHashUtility";
import crypto from "crypto";

export class HashUtility extends CoreHashUtility
{
	protected sha256Hash(value: string): Uint8Array
	{
		return crypto.createHash('sha256').update(value).digest();
	}
}
