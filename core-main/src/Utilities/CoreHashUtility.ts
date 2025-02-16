import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { environment } from "../Environment";
import { Algorithm } from "@vaultic/shared/Types/Keys";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

class CoreHashUtility
{
    constructor() { }

    public async hash(algorithm: Algorithm, value: string, salt: string = ""): Promise<TypedMethodResponse<string | undefined>>
    {
        try 
        {
            switch (algorithm)
            {
                case Algorithm.SHA_256:
                    const valueToHash = value + salt;
                    return TypedMethodResponse.success(bytesToHex(sha256(valueToHash)));
            }
        }
        catch (e: any)
        {
            await environment.repositories.logs.log(undefined, e.toString());
        }

        return TypedMethodResponse.fail();
    }

    public compareHashes(a: string, b: string): boolean
    {
        if (a.length != b.length)
        {
            return false;
        }

        const aBytes = hexToBytes(a);
        const bBytes = hexToBytes(b);

        let equal = 0;
        for (let i = 0; i < aBytes.length; i++)
        {
            equal |= (aBytes[i] ^ bBytes[i]);
        }

        return equal == 0;
    }
}

const coreHashUtility = new CoreHashUtility();
export type ICoreHashUtility = typeof coreHashUtility;
export default coreHashUtility;