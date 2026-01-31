import { deflate, inflate } from "pako";
import { CoreDataUtility } from "../../Core/Main/Utilities/CoreDataUtility";

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
        if (!value || typeof value !== 'string')
        {
            throw new Error('DataUtility.uncompress: value is empty or not a string');
        }
        // atob() requires valid base64: only A-Za-z0-9+/=, no whitespace, length multiple of 4
        const base64 = value.replace(/\s/g, '').replace(/=+$/, '');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(padded))
        {
            throw new Error('DataUtility.uncompress: value is not valid base64 (decryption may have failed or data is corrupted)');
        }
        let binaryString: string;
        try
        {
            binaryString = atob(padded);
        }
        catch (e)
        {
            throw new Error(`DataUtility.uncompress: atob failed - value may be decrypted garbage or corrupted. ${e instanceof Error ? e.message : String(e)}`);
        }
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++)
        {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const inflated = inflate(bytes);
        return new TextDecoder('utf-8').decode(inflated);
	}
}