import { ipcRenderer } from "electron";
import { writeFile } from "../Objects/Files/File";
import axiosHelper from "../Objects/Server/AxiosHelper";
import { GetUserDeactivationKeyResponse } from "../Types/Responses";

export interface VaulticHelper
{
	downloadDeactivationKey: () => Promise<GetUserDeactivationKeyResponse>;
}

export async function downloadDeactivationKey()
{
	const response: GetUserDeactivationKeyResponse = await axiosHelper.post("User/GetUserDeactivationKey");
	if (!response.Success)
	{
		return response;
	}

	const filePath = await ipcRenderer.invoke('dialog:selectDirectory')
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
