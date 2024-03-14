import axios, { AxiosError, AxiosInstance } from 'axios';
import { getDeviceInfo } from '../DeviceInfo';
import { BaseResponse, CreateSessionResponse } from '../../Types/Responses';
import cryptUtility from '../../Utilities/CryptUtility';
import { MethodResponse } from '../../Types/MethodResponse';

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
	timeout: 120000,
	headers: { 'X-M': deviceInfo.mac, 'X-DN': deviceInfo.deviceName },
});

async function getAPIKey()
{
	const date = new Date();
	const string = `${apiKeyPrefix}${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}`;

	const encrypt: MethodResponse = await cryptUtility.encrypt(APIKeyEncryptionKey, string);
	return encrypt.value ?? "";
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
			console.log(e);
			return { success: false, UnknownError: true, StatusCode: e.status, AxiosCode: e.code };
		}
	}

	return { success: false, UnknownError: true };
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
			return { success: false, UnknownError: true, StatusCode: e.status, AxiosCode: e.code };
		}
	}

	return { success: false, UnknownError: true };
}

const axiosHelper: AxiosHelper =
{
	instance: axiosInstance,
	post,
	get
}

export default axiosHelper;
