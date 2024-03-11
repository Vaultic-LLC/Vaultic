import axios, { AxiosError, AxiosInstance } from 'axios';
import { getDeviceInfo } from '../DeviceInfo';
import { BaseResponse, CreateSessionResponse } from '../../Types/Responses';
import cryptUtility from '../../Utilities/CryptUtility';

export interface AxiosHelper
{
	instance: AxiosInstance;
	post: <T extends BaseResponse>(serverPath: string, data: any) => Promise<T | BaseResponse>;
	get: <T extends BaseResponse>(serverPath: string) => Promise<T | BaseResponse>;
}

const APIKeyEncryptionKey = "12fasjkdF2owsnFvkwnvwe23dFSDfio2"
const apiKeyPrefix = "ThisIsTheStartOfTheAPIKey!!!Yahooooooooooooo1234444321-";

const deviceInfo = getDeviceInfo();

const axiosInstance = axios.create({
	baseURL: 'https://localhost:7007/',
	timeout: 99999999999,
	headers: { 'X-M': deviceInfo.mac, 'X-DN': deviceInfo.deviceName },
});

function getAPIKey()
{
	const date = new Date();
	const string = `${apiKeyPrefix}${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}`;

	const encrypt = cryptUtility.encrypt(APIKeyEncryptionKey, string);

	return encrypt;
}

function isCreateSessionResponse(response: any): response is CreateSessionResponse
{
	return 'AntiCSRFToken' in response;
}

async function post<T extends BaseResponse>(serverPath: string, data: any): Promise<T | BaseResponse>
{
	try
	{
		const apiKey = await getAPIKey();
		const response = await axiosInstance.post(serverPath, data, { headers: { "X-AK": apiKey } });

		if (isCreateSessionResponse(response) && response.AntiCSRFToken)
		{
			axiosInstance.defaults.headers.common['X-ACSRF-TOKEN'] = response.AntiCSRFToken;
		}

		return response.data;
	}
	catch (e)
	{
		if (e instanceof AxiosError)
		{
			return { Success: false, UnknownError: true, StatusCode: e.status };
		}
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
		if (e instanceof AxiosError)
		{
			return { Success: false, UnknownError: true, StatusCode: e.status };
		}
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
