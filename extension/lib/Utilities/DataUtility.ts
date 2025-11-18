import { deflate, inflate } from "pako";
import { CoreDataUtility } from "../main/Utilities/CoreDataUtility";

export class DataUtility extends CoreDataUtility
{
	async compress(value: string): Promise<string>
	{
        const bytes = new TextEncoder().encode(value);
        const deflated = deflate(bytes);

        return new TextDecoder('iso-8859-1').decode(deflated);
	}

	async uncompress(value: string): Promise<string>
	{
        const bytes = encodeLatin1(value);
        const inflated = inflate(bytes);

        return new TextDecoder().decode(inflated);
	}
}

function encodeLatin1(value: string): Uint8Array
{
    const bytes = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i++) 
    {
        bytes[i] = value.charCodeAt(i) & 0xFF;
    }

    return bytes;
}