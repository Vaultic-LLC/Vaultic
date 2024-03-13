import { DataFile } from "@renderer/Types/EncryptedData";
import { useUnknownResponsePopup } from "./injectHelper";
import cryptHelper from "./cryptHelper";

// Uesd to read and write files. ContextBridge can only take simple types so we have to do most of
// the heavy lifting on the renderer side and then send just strings back and fourth

export interface FileHelper
{
	read: <T>(key: string, file: DataFile) => Promise<T>;
	write: <T>(key: string, data: T, file: DataFile) => Promise<void>;
}

async function read<T>(key: string, file: DataFile): Promise<T>
{
	const data = await file.read();
	if (!data.success)
	{
		useUnknownResponsePopup()(undefined, data.logID);
		return {} as T;
	}

	const decryptedData = await cryptHelper.decrypt(key, data[1]);
	if (!decryptedData.success)
	{
		return {} as T;
	}

	try
	{
		return JSON.parse(decryptedData.value!) as T;
	}
	catch (e) { }

	return {} as T;
}

async function write<T>(key: string, data: T, file: DataFile): Promise<void>
{
	const jsonData: string = JSON.stringify(data);
	const encryptedData = await cryptHelper.encrypt(key, jsonData);
	if (!encryptedData.success)
	{
		return;
	}

	const result = await file.write(encryptedData.value!);
	if (!result.success)
	{
		useUnknownResponsePopup()(undefined, result.logID);
	}
}

const fileHelper: FileHelper =
{
	read,
	write
};

export default fileHelper;
