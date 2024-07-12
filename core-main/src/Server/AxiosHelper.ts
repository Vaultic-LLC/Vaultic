import axios, { AxiosError, AxiosInstance } from 'axios';
import { BaseResponse, EncryptedResponse, InvalidSessionResponse } from '../Types/Responses';
import { MethodResponse, TypedMethodResponse } from '../Types/MethodResponse';
import vaulticServer from './VaulticServer';
import { environment } from '../Environment';
import { DeviceInfo } from '../Types/Device';
import { PublicPrivateKey } from '../Types/Utilities';

const APIKeyEncryptionKey = "12fasjkdF2owsnFvkwnvwe23dFSDfio2"
const apiKeyPrefix = "ThisIsTheStartOfTheAPIKey!!!Yahooooooooooooo1234444321-";

let deviceInfo: DeviceInfo;
let axiosInstance: AxiosInstance;
let responseKeys: PublicPrivateKey;

// const stsURL = 'https://localhost:7088/';
// const apiURL = 'https://localhost:7007/';

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

class AxiosWrapper
{
    private url: string;

    constructor(url: string) 
    {
        this.url = url;
    }

    // just a little step to make it harder to hit the server from outsite of my apps
    protected async getAPIKey()
    {
        const date = new Date();
        const string = `${apiKeyPrefix}${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}`;

        const encrypt: MethodResponse = await environment.utilities.crypt.encrypt(APIKeyEncryptionKey, string);
        return encrypt.value ?? "";
    }

    async post<T extends BaseResponse>(serverPath: string, data?: any): Promise<T | BaseResponse> 
    {
        try
        {
            const newData = await this.prepRequestData(data);
            const requestData = await this.getRequestData(newData);
            if (!requestData[0].success)
            {
                if (requestData[0].invalidSession)
                {
                    return { Success: false, InvalidSession: true } as InvalidSessionResponse;
                }

                return { Success: false, UnknownError: true, logID: requestData[0].logID };
            }

            const response = await axiosInstance.post(`${this.url}${serverPath}`, requestData[1]);
            const responseResult = await this.handleResponse<T>(response.data);

            if (!responseResult[0].success)
            {
                if (requestData[0].invalidSession)
                {
                    return { Success: false, InvalidSession: true } as InvalidSessionResponse;
                }

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

            // something internal threw an error, like crypt helper or something
            if (e?.message)
            {
                return {
                    Success: false, UnknownError: true, message: e.message + ". If the issue persists, check your connection, restart the app or"
                };
            }

            return { Success: false, UnknownError: true };
        }
    }

    protected async prepRequestData(data?: any): Promise<any>
    {
        let newData = data ?? {};

        // TODO: is this needed still? I think only json data was passed when sending store states to the server, but
        // that doesn't happen anymore. 
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

        newData.APIKey = await this.getAPIKey();
        newData.MacAddress = deviceInfo.mac;
        newData.DeviceName = deviceInfo.deviceName;
        newData.Model = deviceInfo.model;
        newData.Version = deviceInfo.version;

        return newData;
    }

    protected async getRequestData(data?: any): Promise<[MethodResponse, EncryptedResponse]>
    {
        return [{} as MethodResponse, {}];
    }

    protected async handleResponse<T>(response?: any): Promise<[MethodResponse, T]>
    {
        return [{} as MethodResponse, {} as T]
    }
}

class STSAxiosWrapper extends AxiosWrapper
{
    constructor()
    {
        super('https://vaultic-sts.vaulticserver.vaultic.co/');
    }

    protected async getRequestData(data?: any): Promise<[MethodResponse, EncryptedResponse]>
    {
        // we don't have our session key yet, use hybrid encryption to encrypt the post data
        data.ResponsePublicKey = responseKeys.public;
        const encryptedData = await environment.utilities.crypt.hybridEncrypt(JSON.stringify(data));

        if (!encryptedData.success)
        {
            return [encryptedData, { Key: '', Data: '' }]
        }

        return [{ success: true }, { Key: encryptedData.key!, Data: encryptedData.value! }];
    }

    protected async handleResponse<T>(response?: any): Promise<[MethodResponse, T]> 
    {
        let responseData: T = {} as T;
        try
        {
            if (!('Key' in response) || !('Data' in response))
            {
                return [{ success: false }, responseData]
            }

            const encryptedResponse: EncryptedResponse = response as EncryptedResponse;
            const decryptedResponse = await environment.utilities.crypt.hybridDecrypt(responseKeys.private, encryptedResponse);

            if (!decryptedResponse.success)
            {
                return [decryptedResponse, responseData];
            }

            responseData = JSON.parse(decryptedResponse.value!) as T;
            return [{ success: true }, responseData];
        }
        catch (e)
        {
            return [{ success: false }, responseData]
        }
    }
}

class APIAxiosWrapper extends AxiosWrapper
{
    private sessionKey: string | undefined;
    private exportKey: string | undefined;

    constructor()
    {
        super('https://vaultic-api.vaulticserver.vaultic.co/');
    }

    async setSessionInfoAndExportKey(tokenHash: string, sessionKey: string, exportKey: string)
    {
        this.sessionKey = sessionKey;
        this.exportKey = exportKey;

        // an exception will be thrown when trying to set a cookie with a ';' character.
        // use the hash to make sure this doesn't happen
        await environment.sessionHandler.setSession(tokenHash);
    }

    async endToEndEncryptPostData(data: { [key: string]: string }): Promise<TypedMethodResponse<any>>
    {
        if (!this.exportKey)
        {
            return { success: false, errorMessage: "No Export Key" };
        }

        const encryptedData = {};
        const keys = Object.keys(data);

        for (let i = 0; i < keys.length; i++)
        {
            const response = await environment.utilities.crypt.encrypt(this.exportKey, data[keys[i]]);
            if (!response.success)
            {
                return response;
            }

            encryptedData[keys[i]] = response.value!;
        }

        return { success: true, value: encryptedData };
    }

    async decryptEndToEndData(properties: string[], data: { [key: string]: string }): Promise<TypedMethodResponse<any>>
    {
        if (!this.exportKey)
        {
            return { success: false, errorMessage: "No Export Key" };
        }

        const decryptedData = {};
        for (let i = 0; i < properties.length; i++)
        {
            if (!data[properties[i]])
            {
                continue;
            }

            const response = await environment.utilities.crypt.decrypt(this.exportKey, data[properties[i]]);
            if (!response.success)
            {
                return response;
            }

            decryptedData[properties[i]] = response.value!;
        }

        return { success: true, value: decryptedData };
    }

    async post<T extends BaseResponse>(serverPath: string, data?: any): Promise<T | BaseResponse> 
    {
        if (!this.sessionKey)
        {
            return { Success: false, InvalidSession: true } as InvalidSessionResponse;
        }

        return super.post(serverPath, data);
    }

    protected async getRequestData(data?: any): Promise<[MethodResponse, EncryptedResponse]>
    {
        data.ResponsePublicKey = responseKeys.public;

        const sessionHash = await environment.sessionHandler.getSession();
        if (!sessionHash)
        {
            return [{ success: false, invalidSession: true }, { Key: '', Data: '' }]
        }

        const requestData = await environment.utilities.crypt.encrypt(this.sessionKey!, JSON.stringify(data));
        if (!requestData.success)
        {
            return [requestData, { Data: '' }]
        }

        const encryptedData = await environment.utilities.crypt.hybridEncrypt(JSON.stringify({
            SessionTokenHash: sessionHash,
            Data: requestData.value
        }));

        return [{ success: true }, { Key: encryptedData.key, Data: encryptedData.value }];
    }

    protected async handleResponse<T>(response?: any): Promise<[MethodResponse, T]> 
    {
        let responseData: T = {} as T;
        try
        {
            const encryptedResponse: EncryptedResponse = response as EncryptedResponse;
            if (!encryptedResponse.Data)
            {
                return [{ success: false }, responseData]
            }

            const decryptedResponse = await environment.utilities.crypt.decrypt(this.sessionKey!, encryptedResponse.Data);
            if (!decryptedResponse.success)
            {
                return [decryptedResponse, responseData];
            }

            responseData = JSON.parse(decryptedResponse.value!) as T;
            return [{ success: true }, responseData];
        }
        catch (e)
        {
            return [{ success: false }, responseData]
        }
    }
}

export interface AxiosHelper
{
    init: () => void;
    api: APIAxiosWrapper;
    sts: STSAxiosWrapper;
}

const apiAxiosHelper = new APIAxiosWrapper();
const stsAxiosHelper = new STSAxiosWrapper();

const axiosHelper: AxiosHelper =
{
    init,
    api: apiAxiosHelper,
    sts: stsAxiosHelper
};

export default axiosHelper;
