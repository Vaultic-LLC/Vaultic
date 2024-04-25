import axios, { AxiosError, AxiosInstance } from 'axios';
import { getDeviceInfo } from '../DeviceInfo';
import { BaseResponse } from '../../Types/Responses';
import cryptUtility from '../../Utilities/CryptUtility';
import { MethodResponse } from '../../Types/MethodResponse';
import { Session } from '../../Types/Session';

export interface AxiosHelper
{
	instance: AxiosInstance;
	post: <T extends BaseResponse>(serverPath: string, data: any) => Promise<T | BaseResponse>;
	get: <T extends BaseResponse>(serverPath: string) => Promise<T | BaseResponse>;
}

let currentSession: Session;

const APIKeyEncryptionKey = "12fasjkdF2owsnFvkwnvwe23dFSDfio2"
const apiKeyPrefix = "ThisIsTheStartOfTheAPIKey!!!Yahooooooooooooo1234444321-";

const deviceInfo = getDeviceInfo();

const url = 'https://vaultic-api.vaulticserver.vaultic.co/';
const axiosInstance = axios.create({
	baseURL: url,
	timeout: 120000
});

async function getAPIKey()
{
	const date = new Date();
	const string = `${apiKeyPrefix}${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}`;

	const encrypt: MethodResponse = await cryptUtility.encrypt(APIKeyEncryptionKey, string);
	return encrypt.value ?? "";
}

async function post<T extends BaseResponse>(serverPath: string, data: any): Promise<T | BaseResponse>
{
	try
	{
		const requestData = await getRequestData(data);
		const response = await axiosInstance.post(serverPath, requestData);

		handleResponse<T>(response.data);
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

async function get<T extends BaseResponse>(serverPath: string): Promise<T | BaseResponse>
{
	try
	{
		const requestData = await getRequestData({});
		const response = await axiosInstance.post(serverPath, requestData);

		handleResponse<T>(response.data);
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

async function getRequestData(data: any)
{
	let newData = data;
	try
	{
		if (typeof data === 'string')
		{
			newData = JSON.parse(data);
		}
	}
	catch (e)
	{

	}

	newData.Session = currentSession;
	newData.APIKey = await getAPIKey();
	newData.MacAddress = deviceInfo.mac;
	newData.DeviceName = deviceInfo.deviceName;

	const encryptedData = await cryptUtility.hybridEncrypt(JSON.stringify(newData));
	if (!encryptedData.success)
	{
		// handle
	}

	return { Key: encryptedData.key, Data: encryptedData.value };
}

function handleResponse<T extends BaseResponse>(response: T)
{
	if ('session' in response)
	{
		const session: Session = response.session as Session;
		if (session.id && session.token)
		{
			currentSession = session;
		}
	}
}

const axiosHelper: AxiosHelper =
{
	instance: axiosInstance,
	post,
	get
}

export default axiosHelper;
