import { deflate, inflate } from "pako";
import { CoreDataUtility } from "../../Core/Main/Utilities/CoreDataUtility";

/** Decode base64 to Uint8Array using atob (works on all Android WebView versions; fromBase64 requires Chrome 140+). */
function base64ToUint8Array(base64: string): Uint8Array
{
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++)
		bytes[i] = binary.charCodeAt(i);
	return bytes;
}

/** Encode Uint8Array to base64 using btoa (works on all Android WebView versions; toBase64 requires Chrome 140+). */
function uint8ArrayToBase64(bytes: Uint8Array): string
{
	let binary = "";
	for (let i = 0; i < bytes.length; i++)
		binary += String.fromCharCode(bytes[i]!);
	return btoa(binary);
}

export class DataUtility extends CoreDataUtility
{
	async compress(value: string): Promise<string>
	{
		const bytes = new TextEncoder().encode(value);
		const deflated = deflate(bytes);
		return uint8ArrayToBase64(deflated);
	}

	async uncompress(value: string): Promise<string>
	{
		try
		{
			const bytes = base64ToUint8Array(value);
			const inflated = inflate(bytes);
            return new TextDecoder('utf-8').decode(inflated);
        }
        catch (error)
        {
            console.log(`Error decoding deflated: ${error}`);
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