import { DataFile } from "@renderer/Types/EncryptedData";
import cryptHelper from "./cryptHelper";
import { stores } from "@renderer/Objects/Stores";

// Uesd to read and write files. ContextBridge can only take simple types so we have to do most of
// the heavy lifting on the renderer side and then send just strings back and fourth

export interface FileHelper
{
	read: <T>(key: string, file: DataFile) => Promise<[boolean, T]>;
	write: <T>(key: string, data: T, file: DataFile) => Promise<void>;
	readUnencrypted: <T>(file: DataFile) => Promise<[boolean, T]>;
	writeUnencrypted: <T>(data: T, file: DataFile) => Promise<void>;
}

async function read<T>(key: string, file: DataFile): Promise<[boolean, T]>
{
	const result = await file.read();
	if (!result.success)
	{
		stores.popupStore.showErrorAlert(result.logID);
		return [false, {} as T];
	}

	const decryptedData = await cryptHelper.decrypt(key, result.value!);
	if (!decryptedData.success)
	{
		// don't show an error since this can happen if the key is wrong
		return [false, {} as T];
	}

	try
	{
		return [true, JSON.parse(decryptedData.value!) as T];
	}
	catch (e) { }

	return [false, {} as T];
}

async function readUnencrypted<T>(file: DataFile): Promise<[boolean, T]>
{
	const result = await file.read();
	if (!result.success)
	{
		stores.popupStore.showErrorAlert(result.logID);
		return [false, {} as T];
	}

	try
	{
		return [true, JSON.parse(result.value!) as T];
	}
	catch (e) { }

	return [false, {} as T];
}

async function write<T>(key: string, data: T, file: DataFile): Promise<void>
{
	const jsonData: string = JSON.stringify(data);
	const encryptedData = await cryptHelper.encrypt(key, jsonData);
	if (!encryptedData.success)
	{
		stores.popupStore.showErrorAlert(encryptedData.logID);
		return;
	}

	const result = await file.write(encryptedData.value!);
	if (!result.success)
	{
		stores.popupStore.showErrorAlert(result.logID);
	}
}

async function writeUnencrypted<T>(data: T, file: DataFile): Promise<void>
{
	const jsonData: string = JSON.stringify(data);
	const result = await file.write(jsonData);
	if (!result.success)
	{
		stores.popupStore.showErrorAlert(result.logID);
	}
}

const fileHelper: FileHelper =
{
	read,
	write,
	readUnencrypted,
	writeUnencrypted
};

export default fileHelper;
