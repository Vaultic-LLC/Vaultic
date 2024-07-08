import { dialog } from "electron";
import { writeFile } from "../Objects/Files/File";
import axiosHelper from "../Core/Server/AxiosHelper";
import { GetUserDeactivationKeyResponse } from "../Core/Types/Responses";
import fs from "fs";

export interface VaulticHelper
{
	downloadDeactivationKey: () => Promise<GetUserDeactivationKeyResponse>;
	readCSV: () => Promise<[boolean, string]>;
	writeCSV: (data: string) => Promise<boolean>;
}

async function selectDirectory()
{
	const { canceled, filePaths } = await dialog.showOpenDialog({
		properties: ['openDirectory']
	});

	if (!canceled)
	{
		return filePaths[0];
	}

	return '';
}

export async function downloadDeactivationKey()
{
	const response: GetUserDeactivationKeyResponse = await axiosHelper.postAPI("User/GetUserDeactivationKey");
	if (!response.Success)
	{
		return response;
	}

	const filePath = await selectDirectory();
	if (!filePath)
	{
		response.Success = false;
		response.UnknownError = true;

		return response;
	}

	try
	{
		await writeFile(filePath + "\\Vaultic-Deactivation-Key.txt", response.DeactivationKey!);
		return response;
	}
	catch { }

	response.Success = false;
	response.UnknownError = true;

	return response;
}

async function readCSV(): Promise<[boolean, string]>
{
	const { canceled, filePaths } = await dialog.showOpenDialog({
		properties: ['openFile'],
		filters: [{ name: 'csvs', extensions: ['csv'] }]
	});

	if (canceled)
	{
		return [false, ''];
	}

	return new Promise<[boolean, string]>((resolve) =>
	{
		fs.readFile(filePaths[0], { encoding: 'utf8' }, (err, data) =>
		{
			if (err != null)
			{
				resolve([true, '']);
				return;
			}

			resolve([true, data]);
		});
	});
}

async function writeCSV(data: string): Promise<boolean>
{
	const filePath = await selectDirectory();
	if (!filePath)
	{

		return false;
	}

	return new Promise((resolve) =>
	{
		fs.writeFile(filePath[0], data, () =>
		{
			resolve(true);
		});
	});
}

const vaulticHelper: VaulticHelper =
{
	downloadDeactivationKey,
	readCSV,
	writeCSV,
}

export default vaulticHelper;
