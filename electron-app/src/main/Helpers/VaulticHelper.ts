import { dialog, ipcRenderer } from "electron";
import { writeFile } from "../Objects/Files/File";
import axiosHelper from "../Core/Server/AxiosHelper";
import { GetUserDeactivationKeyResponse } from "../Core/Types/Responses";

export interface VaulticHelper
{
	downloadDeactivationKey: () => Promise<GetUserDeactivationKeyResponse>;
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
	const response: GetUserDeactivationKeyResponse = await axiosHelper.api.post("User/GetUserDeactivationKey");
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

const vaulticHelper: VaulticHelper =
{
	downloadDeactivationKey
}

export default vaulticHelper;
