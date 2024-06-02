import axios, { AxiosError } from 'axios';
import { getDeviceInfo } from '../DeviceInfo';
import { BaseResponse, EncryptedResponse } from '../../Types/Responses';
import cryptUtility from '../../Utilities/CryptUtility';
import { MethodResponse } from '../../Types/MethodResponse';
import { Session } from '../../Types/ClientServerTypes';
import { AxiosHelper, EncryptedRequest } from '../../Types/ServerTypes';
import vaulticServer from './VaulticServer';
import generatorUtility from '../../Utilities/Generator';
import { session } from "electron"

let sessionToken: string;

const APIKeyEncryptionKey = "12fasjkdF2owsnFvkwnvwe23dFSDfio2"
const apiKeyPrefix = "ThisIsTheStartOfTheAPIKey!!!Yahooooooooooooo1234444321-";

const deviceInfo = getDeviceInfo();

const stsURL = 'https://vaultic-sts.vaulticserver.vaultic.co/';
const apiURL = 'https://vaultic-api.vaulticserver.vaultic.co/';

// const stsURL = 'https://localhost:7088/';
// const apiURL = 'https://localhost:7007/'

const axiosInstance = axios.create({
	timeout: 120000,
	validateStatus: (status: number) =>
	{
		return (status >= 200 && status < 300) || status == 401 || status == 403;
	}
});

const responseKeys = generatorUtility.publicPrivateKey();

async function getAPIKey()
{
	const date = new Date();
	const string = `${apiKeyPrefix}${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}`;

	const encrypt: MethodResponse = await cryptUtility.encrypt(APIKeyEncryptionKey, string);
	return encrypt.value ?? "";
}

async function getHeaders(sts: boolean): Promise<any>
{
	let headers = {};
	if (!sts)
	{
		const sessionHashCookie = await session.defaultSession.cookies.get({ url: 'http://www.vaultic.co' });
		if (sessionHashCookie.length > 0)
		{
			headers["X-STH"] = sessionHashCookie[0].value ?? ""
		}
	}

	return headers
}

async function postSTS<T extends BaseResponse>(serverPath: string, data?: any): Promise<T | BaseResponse>
{
	return post<T>(`${stsURL}${serverPath}`, true, data);
}

async function postAPI<T extends BaseResponse>(serverPath: string, data?: any): Promise<T | BaseResponse>
{
	return post<T>(`${apiURL}${serverPath}`, false, data);
}

async function post<T extends BaseResponse>(url: string, sts: boolean, data?: any): Promise<T | BaseResponse>
{
	try
	{
		const requestData = await getRequestData(responseKeys.publicKey, data);
		if (!requestData[0].success)
		{
			return { Success: false, UnknownError: true, logID: requestData[0].logID, message: 'request error' };
		}

		const headers: any = await getHeaders(sts);
		const response = await axiosInstance.post(url, requestData[1], { headers: headers });
		const responseResult = await handleResponse<T>(responseKeys.privateKey, response.data);

		if (!responseResult[0].success)
		{
			return { Success: false, UnknownError: true, logID: responseResult[0].logID, message: responseResult[0].errorMessage };
		}

		return responseResult[1];
	}
	catch (e: any)
	{
		if (e instanceof AxiosError)
		{
			// Bad request data response, we can handle that
			if (e.status == 400)
			{
				return { Success: false, InvalidRequest: true };
			}

			if (e.response)
			{
				return { Success: false, UnknownError: true, statusCode: e?.response?.status, axiosCode: e?.code, message: "Invalid response, please try again. If the issue persists, check your connection, restart the app or" };
			}

			if (e.request)
			{
				return { Success: false, UnknownError: true, axiosCode: e?.code, message: "Invalid request, please try again. If the issue persists, check your connection, restart the app or" };
			}
		}

		if (e?.message)
		{
			return {
				Success: false, UnknownError: true, message: e.message + ". If the issue persists, check your connection, restart the app or"
			};
		}

		return { Success: false, UnknownError: true };
	}
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
	newData.SessionToken = sessionToken;
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
	try
	{
		if (!('Key' in response) || !('Data' in response))
		{
			return [{ success: false }, responseData]
		}

		const encryptedResponse: EncryptedResponse = response as EncryptedResponse;
		const decryptedResponse = await cryptUtility.hybridDecrypt(privateKey, encryptedResponse);

		if (!decryptedResponse.success)
		{
			return [decryptedResponse, responseData];
		}

		responseData = JSON.parse(decryptedResponse.value!) as T;

		if ('Session' in responseData)
		{
			const clientSession: Session = responseData.Session as Session;
			if (clientSession.Token && clientSession.Hash)
			{
				sessionToken = clientSession.Token;
				// an exception will be thrown when trying to set a cookie with a ';' character. Use the hash
				// to make sure this doesn't happen
				const sessionTokenHashCookie = { url: 'http://www.vaultic.co', name: 'SessionTokenHash', value: clientSession.Hash }
				await session.defaultSession.cookies.set(sessionTokenHashCookie);
			}
		}

		return [{ success: true }, responseData];
	}
	catch (e)
	{
		return [{ success: false }, responseData]
	}
}

const axiosHelper: AxiosHelper =
{
	instance: axiosInstance,
	postSTS,
	postAPI
}

export default axiosHelper;
