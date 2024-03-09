import axios, { AxiosInstance } from 'axios';
import { getDeviceInfo } from '../DeviceInfo';
import { BaseResponse } from '../../Types/Responses';
import { internalEncrypt } from '../../Utilities/CryptUtility';

export interface AxiosHelper
{
	instance: AxiosInstance;
	post: <T extends BaseResponse>(serverPath: string, data: any) => Promise<T | BaseResponse>;
	get: <T extends BaseResponse>(serverPath: string) => Promise<T | BaseResponse>;
}

const APIKeyEncryptionKey = "12fasjkdF2owsnFvkwnvwe23dFSDfio2"
const apiKeyPrefix = "ThisIsTheStartOfTheAPIKey!!!Yahooooooooooooo1234444321-";

const axiosInstance = axios.create({
	baseURL: 'https://localhost:7007/',
	timeout: 99999999999,
	headers: { 'X-M': getDeviceInfo().mac },
	//responseType: 'json',
});

function getAPIKey()
{
	const date = new Date();
	const string = `${apiKeyPrefix}${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}`;

	const encrypt = internalEncrypt(APIKeyEncryptionKey, string, true);

	return encrypt;
}

async function post<T extends BaseResponse>(serverPath: string, data: any): Promise<T | BaseResponse>
{
	try
	{
		const apiKey = await getAPIKey();
		const response = await axiosInstance.post(serverPath, data, { headers: { "X-AK": apiKey } });
		return response.data;
	}
	catch (e)
	{
		// something went wrong
		// Create an ID using a GUID and log to server. Present user with ID when mentioning that
		// an error occurred and to reach out to cusotmer service with the ID if the issue persists
	}

	return { Success: false, UnknownError: true };
}

async function get<T extends BaseResponse>(serverPath: string): Promise<T | BaseResponse>
{
	try
	{
		const apiKey = await getAPIKey();
		const response = await axiosInstance.get(serverPath, { headers: { "X-AK": apiKey } });
		return response.data;
	}
	catch (e)
	{
		// something went wrong
	}

	return { Success: false, UnknownError: true };
}

const axiosHelper: AxiosHelper =
{
	instance: axiosInstance,
	post,
	get
}

export default axiosHelper;
