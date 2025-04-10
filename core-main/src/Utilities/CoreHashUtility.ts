import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { environment } from "../Environment";
import { Algorithm } from "@vaultic/shared/Types/Keys";
import { ClientHashUtility } from "@vaultic/shared/Types/Utilities";

export class CoreHashUtility implements ClientHashUtility
{
    constructor() { }

    public async hash(algorithm: Algorithm, value: string, salt: string = ""): Promise<TypedMethodResponse<string | undefined>>
    {
        try 
        {
            const valueToHash = value + salt;
            switch (algorithm)
            {
                case Algorithm.SHA_256:
                    return TypedMethodResponse.success(environment.utilities.crypt.bytesToHex(this.sha256Hash(valueToHash)));
            }
        }
        catch (e: any)
        {
            await environment.repositories.logs.log(undefined, e.toString(), "Hash");
        }

        return TypedMethodResponse.fail();
    }

    public compareHashes(a: string, b: string): boolean
    {
        if (a.length != b.length)
        {
            return false;
        }

        const aBytes = environment.utilities.crypt.hexToBytes(a);
        const bBytes = environment.utilities.crypt.hexToBytes(b);

        let equal = 0;
        for (let i = 0; i < aBytes.length; i++)
        {
            equal |= (aBytes[i] ^ bBytes[i]);
        }

        return equal == 0;
    }

    protected sha256Hash(value: string): Uint8Array
    {
        throw "Not Implemented";
    }
}