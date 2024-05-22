import axios, { AxiosError } from 'axios';
import { getDeviceInfo } from '../DeviceInfo';
import { BaseResponse, EncryptedResponse } from '../../Types/Responses';
import cryptUtility from '../../Utilities/CryptUtility';
import { MethodResponse } from '../../Types/MethodResponse';
import { Session } from '../../Types/ClientServerTypes';
import { AxiosHelper, EncryptedRequest } from '../../Types/ServerTypes';
import vaulticServer from './VaulticServer';
import generatorUtility from '../../Utilities/Generator';

let currentSession: Session;

const APIKeyEncryptionKey = "12fasjkdF2owsnFvkwnvwe23dFSDfio2"
const apiKeyPrefix = "ThisIsTheStartOfTheAPIKey!!!Yahooooooooooooo1234444321-";

const deviceInfo = getDeviceInfo();

const url = 'https://vaultic-api.vaulticserver.vaultic.co/';
const axiosInstance = axios.create({
	baseURL: url,
	timeout: 120000,
	withCredentials: true
});

const responseKeys = generatorUtility.publicPrivateKey();

async function getAPIKey()
{
	const date = new Date();
	const string = `${apiKeyPrefix}${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}`;

	const encrypt: MethodResponse = await cryptUtility.encrypt(APIKeyEncryptionKey, string);
	return encrypt.value ?? "";
}

async function post<T extends BaseResponse>(serverPath: string, data?: any): Promise<T | BaseResponse>
{
	try
	{
		const requestData = await getRequestData(responseKeys.publicKey, data);
		if (!requestData[0].success)
		{
			return { Success: false, UnknownError: true, logID: requestData[0].logID };
		}

		const response = await axiosInstance.post(serverPath, requestData[1]);
		console.log(response.headers['set-cookie']);
		const responseResult = await handleResponse<T>(responseKeys.privateKey, response.data);

		if (!responseResult[0].success)
		{
			return { Success: false, UnknownError: true, logID: responseResult[0].logID };
		}

		return responseResult[1];
	}
	catch (e: any)
	{
		console.log(e);
		if (e instanceof AxiosError)
		{
			return { Success: false, UnknownError: true, statusCode: e.status, axiosCode: e.code };
		}
	}

	return { Success: false, UnknownError: true };
}

async function getRequestData(publicKey: string, data: any): Promise<[MethodResponse, EncryptedRequest]>
{
	let newData = data ?? {};

	try
	{
		if (typeof data === 'string')
		{
			newData = JSON.parse(data);
		}
	}
	catch (e: any)
	{
		if (e?.error instanceof Error)
		{
			const error: Error = e?.error as Error;
			const response = await vaulticServer.app.log(error.message, "AxiosHelper.GetRequestData");
			if (response.Success)
			{
				return [{ success: false, logID: response.logID }, { Key: '', Data: '' }]
			}
		}
	}

	newData.ResponsePublicKey = publicKey;
	newData.Session = currentSession;
	newData.APIKey = await getAPIKey();
	newData.MacAddress = deviceInfo.mac;
	newData.DeviceName = deviceInfo.deviceName;
	newData.Model = deviceInfo.model;
	newData.Version = deviceInfo.version;

	const encryptedData = await cryptUtility.hybridEncrypt(JSON.stringify(newData));
	if (!encryptedData.success)
	{
		return [encryptedData, { Key: '', Data: '' }]
	}

	return [{ success: true }, { Key: encryptedData.key!, Data: encryptedData.value! }];
}

async function handleResponse<T extends BaseResponse>(privateKey: string, response: any): Promise<[MethodResponse, T]>
{
	let responseData: T = {} as T;
	if ('key' in response && 'data' in response)
	{
		const encryptedResponse: EncryptedResponse = response as EncryptedResponse;
		const decryptedResponse = await cryptUtility.hybridDecrypt(privateKey, encryptedResponse);

		if (!decryptedResponse.success)
		{
			return [decryptedResponse, responseData];
		}

		responseData = JSON.parse(decryptedResponse.value!) as T;
	}

	if ('Session' in responseData)
	{
		const session: Session = responseData.Session as Session;
		if (session.ID && session.Token)
		{
			currentSession = session;
		}
	}

	return [{ success: true }, responseData];
}

const axiosHelper: AxiosHelper =
{
	instance: axiosInstance,
	post
}

export default axiosHelper;
