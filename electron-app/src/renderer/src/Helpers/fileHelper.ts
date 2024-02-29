import { DataFile } from "@renderer/Types/EncryptedData";

// Uesd to read and write files. ContextBridge can only take simple types so we have to do most of
// the heavy lifting on the renderer side and then send just strings back and fourth

export interface FileHelper
{
	read: <T>(key: string, file: DataFile) => Promise<T>;
	write: <T>(key: string, data: T, file: DataFile) => Promise<void>;
}

async function read<T>(key: string, file: DataFile): Promise<T>
{
	const data: string = await file.read();
	if (!data)
	{
		return {} as T;
	}

	// TOOD: Error logging
	try
	{
		const decryptedData: string = window.api.utilities.crypt.decrypt(key, data);
		return JSON.parse(decryptedData) as T;
	}
	catch { }

	return {} as T;
}

async function write<T>(key: string, data: T, file: DataFile): Promise<void>
{
	try
	{
		const jsonData: string = JSON.stringify(data);
		const encryptedData: string = window.api.utilities.crypt.encrypt(key, jsonData);

		await file.write(encryptedData);
	}
	catch { }
}

const fileHelper: FileHelper =
{
	read,
	write
};

export default fileHelper;
