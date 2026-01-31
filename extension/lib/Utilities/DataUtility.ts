import { deflate, inflate } from "pako";
import { CoreDataUtility } from "../main/Utilities/CoreDataUtility";

export class DataUtility extends CoreDataUtility
{
	async compress(value: string): Promise<string>
	{
        const bytes = new TextEncoder().encode(value);
        const deflated = deflate(bytes);
    
        //@ts-ignore
        return deflated.toBase64();
	}

	async uncompress(value: string): Promise<string>
	{
        try 
        {
            //@ts-ignore
            const bytes = Uint8Array.fromBase64(value);
            const inflated = inflate(bytes);
            return new TextDecoder('utf-8').decode(inflated);
        }
        catch (error)
        {
            // fallback to trying to decode latin1
            try
            {
                const bytes = new Uint8Array(value.length);
                for (let i = 0; i < value.length; i++) 
                {
                    bytes[i] = value.charCodeAt(i) & 0xFF;
                }

                const inflated = inflate(bytes);
                return new TextDecoder().decode(inflated);
            }
            catch (error)
            {
                console.log(`Error decoding latin1: ${error}`);
            }
        }
    
        return "";
	}
}