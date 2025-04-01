import { environment } from "../Environment";

export class CoreDataUtility
{
    constructor() { }

    compress(value: string): Promise<string> 
    {
        throw "not implemented";
    }

    uncompress(value: string): Promise<string>
    {
        throw "not implemented";
    }

    async decryptAndUncompress(key: string, value: string)
    {
        const result = await environment.utilities.crypt.symmetricDecrypt(key, value);
        if (!result.success)
        {
            return;
        }

        return await environment.utilities.data.uncompress(result.value);
    }

    async compressAndEncrypt(key: string, value: string)
    {
        const compressed = await environment.utilities.data.compress(value);
        const encrypted = await environment.utilities.crypt.symmetricEncrypt(key, compressed);

        if (!encrypted.success)
        {
            return;
        }

        return encrypted.value;
    }
}