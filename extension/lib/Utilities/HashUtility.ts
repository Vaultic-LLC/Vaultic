import { CoreHashUtility } from "../Main/Utilities/CoreHashUtility";
import { crypto_hash_sha256 } from "libsodium-wrappers-sumo";

export class HashUtility extends CoreHashUtility
{
	protected sha256Hash(value: string): Uint8Array
	{
        return crypto_hash_sha256(value);
	}
}