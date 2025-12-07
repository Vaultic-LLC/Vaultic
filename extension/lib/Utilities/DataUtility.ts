import { deflate, inflate } from "pako";
import { CoreDataUtility } from "../main/Utilities/CoreDataUtility";

export class DataUtility extends CoreDataUtility
{
	async compress(value: string): Promise<string>
	{
        const bytes = new TextEncoder().encode(value);
        const deflated = deflate(bytes);
    
        const binaryString = String.fromCharCode(...deflated);
        return btoa(binaryString);
	}

	async uncompress(value: string): Promise<string>
	{
        const binaryString = atob(value);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++)
        {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const inflated = inflate(bytes);
        return new TextDecoder('utf-8').decode(inflated);
	}
}