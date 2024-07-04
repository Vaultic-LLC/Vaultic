import axios, { AxiosError, AxiosInstance } from 'axios';
import { BaseResponse, EncryptedResponse } from '../Types/Responses';
import { MethodResponse } from '../Types/MethodResponse';
import { Session } from '../Types/ClientServerTypes';
import { AxiosHelper, EncryptedRequest } from '../Types/ServerTypes';
import vaulticServer from './VaulticServer';
import { environment } from '../Environment';
import { DeviceInfo } from '../Types/Device';
import { PublicPrivateKey } from '../Types/Utilities';

let sessionToken: string;

const APIKeyEncryptionKey = "12fasjkdF2owsnFvkwnvwe23dFSDfio2"
const apiKeyPrefix = "ThisIsTheStartOfTheAPIKey!!!Yahooooooooooooo1234444321-";

let deviceInfo: DeviceInfo;
let responseKeys: PublicPrivateKey;;
let axiosInstance: AxiosInstance;

const stsURL = 'https://vaultic-sts.vaulticserver.vaultic.co/';
const apiURL = 'https://vaultic-api.vaulticserver.vaultic.co/';

// const stsURL = 'https://localhost:7088/';
// const apiURL = 'https://localhost:7007/'

function init()
{
    // can't access environment before it has been initalized
    deviceInfo = environment.getDeviceInfo();
    responseKeys = environment.utilities.generator.publicPrivateKey();

    axiosInstance = axios.create({
        timeout: 120000,
        validateStatus: (status: number) =>
        {
            return (status >= 200 && status < 300) || status == 401 || status == 403;
        }
    });
}

async function getAPIKey()
{
    const date = new Date();
    const string = `${apiKeyPrefix}${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}`;

    const encrypt: MethodResponse = await environment.utilities.crypt.encrypt(APIKeyEncryptionKey, string);
    return encrypt.value ?? "";
}

async function getHeaders(sts: boolean): Promise<any>
{
    let headers = {};
    if (!sts)
    {
        const sessionHashCookie = await environment.sessionHandler.getSession();
        headers["X-STH"] = sessionHashCookie;
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
        const requestData = await getRequestData(responseKeys.public, data);
        if (!requestData[0].success)
        {
            return { Success: false, UnknownError: true, logID: requestData[0].logID, message: 'request error' };
        }

        const headers: any = await getHeaders(sts);
        const response = await axiosInstance.post(url, requestData[1], { headers: headers });
        const responseResult = await handleResponse<T>(responseKeys.private, response.data);

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

    const encryptedData = await environment.utilities.crypt.hybridEncrypt(JSON.stringify(newData));
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
        const decryptedResponse = await environment.utilities.crypt.hybridDecrypt(privateKey, encryptedResponse);

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
                await environment.sessionHandler.setSession(clientSession.Hash);
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
    init,
    postSTS,
    postAPI
}

export default axiosHelper;
