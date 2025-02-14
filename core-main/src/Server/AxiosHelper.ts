import axios, { AxiosError, AxiosInstance } from 'axios';
import vaulticServer from './VaulticServer';
import { environment } from '../Environment';
import { FieldTree } from '../Types/FieldTree';
import { DeviceInfo } from '@vaultic/shared/Types/Device';
import { TypedMethodResponse } from '@vaultic/shared/Types/MethodResponse';
import { BaseResponse, EncryptedResponse, InvalidSessionResponse } from '@vaultic/shared/Types/Responses';
import { PublicPrivateKey } from '@vaultic/shared/Types/Keys';

const APIKeyEncryptionKey = "12fasjkdF2owsnFvkwnvwe23dFSDfio2"
const apiKeyPrefix = "ThisIsTheStartOfTheAPIKey!!!Yahooooooooooooo1234444321-";

let deviceInfo: DeviceInfo;
let axiosInstance: AxiosInstance;

// Don't move in cache so I don't have to worry about changing keys while requests may still be in transit
let responseKeys: PublicPrivateKey<string>;

// can't access environment before it has been initalized
function init()
{
    deviceInfo = environment.getDeviceInfo();
    responseKeys = environment.utilities.generator.publicPrivateKey();

    if (environment.isTest)
    {
        stsAxiosHelper.init('https://localhost:7088/');
        apiAxiosHelper.init('https://localhost:7007/');
    }
    else
    {
        stsAxiosHelper.init('https://vaultic-sts.vaulticserver.vaultic.co/');
        apiAxiosHelper.init('https://vaultic-api.vaulticserver.vaultic.co/');
    }

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
    private initalized: boolean;

    constructor() { }

    init(url: string)
    {
        if (this.initalized)
        {
            return;
        }

        this.initalized = true;
        this.url = url;
    }

    // just a little step to make it harder to hit the server from outsite of my apps
    protected async getAPIKey()
    {
        const date = new Date();
        const string = `${apiKeyPrefix}${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}`;

        const encrypt = await environment.utilities.crypt.symmetricEncrypt(APIKeyEncryptionKey, string);
        return encrypt.value ?? "";
    }

    async post<T extends BaseResponse>(serverPath: string, data?: any): Promise<T | BaseResponse> 
    {
        let returnResponse: BaseResponse = { Success: false };

        try
        {
            const newData = await this.prepRequestData(data);
            const requestData = await this.getRequestData(newData);

            if (requestData.success)
            {
                const response = await axiosInstance.post(`${this.url}${serverPath}`, requestData.value);
                const responseResult = await this.handleResponse<T>(response.data);

                console.log(`Response: ${JSON.stringify(responseResult)}`);
                if (responseResult.success)
                {
                    return responseResult.value;
                }
                else
                {
                    if (responseResult.invalidSession)
                    {
                        returnResponse = { Success: false, InvalidSession: true } as InvalidSessionResponse;
                    }
                    else 
                    {
                        returnResponse = { Success: false, UnknownError: true, logID: responseResult.logID, message: `code: ${response.status} - ${responseResult.errorMessage}` };
                    }
                }
            }
            else 
            {
                if (requestData.invalidSession)
                {
                    returnResponse = { Success: false, InvalidSession: true } as InvalidSessionResponse;
                }
                else
                {
                    returnResponse = { Success: false, UnknownError: true, logID: requestData[0].logID };
                }
            }
        }
        catch (e: any)
        {
            if (e instanceof AxiosError)
            {
                // Bad request data response, we can handle that
                if (e.status == 400)
                {
                    returnResponse = { Success: false, InvalidRequest: true, message: "400" };
                }
                else if (e.response)
                {
                    returnResponse = { Success: false, UnknownError: true, statusCode: e?.response?.status, axiosCode: e?.code, message: "Invalid response, please try again. If the issue persists, check your connection, restart the app or" };
                }
                else if (e.request)
                {
                    returnResponse = { Success: false, UnknownError: true, axiosCode: e?.code, message: "Invalid request, please try again. If the issue persists, check your connection, restart the app or" };
                }
            }
            // something internal threw an error, like crypt helper or something
            else if (e?.message)
            {
                returnResponse = {
                    Success: false, UnknownError: true, message: e.message + ". If the issue persists, check your connection, restart the app or"
                };
            }
            else 
            {
                returnResponse = { Success: false, UnknownError: true, message: `Unknown Error in AxiosHelper` };
            }
        }

        // we failed, log it
        await environment.repositories.logs.log(undefined, JSON.vaulticStringify({ result: returnResponse, endpoint: serverPath }), "AxiosHelper");
        return returnResponse as BaseResponse;
    }

    protected async prepRequestData(data?: any): Promise<any>
    {
        let newData = data ?? {};

        // For sending complex data throuch IPC
        try
        {
            if (typeof data === 'string')
            {
                newData = JSON.vaulticParse(data);
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

    protected async getRequestData(data?: any): Promise<TypedMethodResponse<EncryptedResponse>>
    {
        return {} as TypedMethodResponse<EncryptedResponse>;
    }

    protected async handleResponse<T>(response?: any): Promise<TypedMethodResponse<T>>
    {
        return TypedMethodResponse.fail(undefined, undefined, "Not attempted");
    }
}

class STSAxiosWrapper extends AxiosWrapper
{
    constructor()
    {
        super();
    }

    protected async getRequestData(data?: any): Promise<TypedMethodResponse<EncryptedResponse>>
    {
        // we don't have our session key yet, use hybrid encryption to encrypt the post data
        data.ResponsePublicKey = responseKeys.public;
        return await environment.utilities.crypt.hybridEncrypt(JSON.vaulticStringify(data));
    }

    protected async handleResponse<T>(response?: any): Promise<TypedMethodResponse<T>> 
    {
        let responseData: T = {} as T;

        try
        {
            if (!response)
            {
                return TypedMethodResponse.fail(undefined, undefined, "No Response");
            }

            if (!('Key' in response) || !('Data' in response))
            {
                return TypedMethodResponse.fail(undefined, undefined, "No Key or Data");
            }

            const encryptedResponse: EncryptedResponse = response as EncryptedResponse;
            const decryptedResponse = await environment.utilities.crypt.hybridDecrypt(responseKeys.private, encryptedResponse);

            if (!decryptedResponse.success)
            {
                return TypedMethodResponse.propagateFail(decryptedResponse, "handleResponse");
            }

            responseData = JSON.vaulticParse(decryptedResponse.value!) as T;
            return TypedMethodResponse.success(responseData);
        }
        catch (e)
        {
            return TypedMethodResponse.fail(undefined, "handleResposne", `Exception: ${e?.message}`);
        }
    }
}

class APIAxiosWrapper extends AxiosWrapper
{
    constructor()
    {
        super();
    }

    async endToEndEncryptPostData(fieldTree: FieldTree, data: { [key: string]: any }): Promise<TypedMethodResponse<any>>
    {
        if (!environment.cache.exportKey)
        {
            return TypedMethodResponse.fail(undefined, undefined, "No Export Key");
        }

        if (fieldTree.properties)
        {
            for (let i = 0; i < fieldTree.properties.length; i++)
            {
                if (data[fieldTree.properties[i]] == undefined)
                {
                    continue;
                }

                const response = await environment.utilities.crypt.symmetricEncrypt(environment.cache.exportKey, data[fieldTree.properties[i]]);
                if (!response.success)
                {
                    response.addToErrorMessage(`Prop: ${fieldTree.properties[i]}`);
                    return response;
                }

                data[fieldTree.properties[i]] = response.value!;
            }
        }

        if (fieldTree.nestedProperties)
        {
            const keys = Object.keys(fieldTree.nestedProperties);
            for (let i = 0; i < keys.length; i++)
            {
                if (data[keys[i]] == undefined)
                {
                    continue;
                }

                if (Array.isArray(data[keys[i]]))
                {
                    const encryptedValues: any = [];
                    const nestedProperties: any[] = data[keys[i]];

                    for (let j = 0; j < nestedProperties.length; j++)
                    {
                        const innerObject = await this.endToEndEncryptPostData(fieldTree.nestedProperties[keys[i]], data[keys[i]][j])
                        if (!innerObject.success)
                        {
                            return innerObject;
                        }

                        encryptedValues.push(innerObject.value!);
                    }

                    data[keys[i]] = encryptedValues;
                }
                else 
                {
                    const innerObject = await this.endToEndEncryptPostData(fieldTree.nestedProperties[keys[i]] as FieldTree, data[keys[i]])
                    if (!innerObject.success)
                    {
                        return innerObject;
                    }

                    data[keys[i]] = innerObject.value!;
                }
            }
        }

        return TypedMethodResponse.success(data);
    }

    async decryptEndToEndData(fieldTree: FieldTree, data: { [key: string]: any }): Promise<TypedMethodResponse<any>>
    {
        if (!environment.cache.exportKey)
        {
            return TypedMethodResponse.fail(undefined, undefined, "No Export Key");
        }

        if (fieldTree.properties)
        {
            for (let i = 0; i < fieldTree.properties.length; i++)
            {
                if (!data[fieldTree.properties[i]])
                {
                    continue;
                }

                const response = await environment.utilities.crypt.symmetricEncrypt(environment.cache.exportKey, data[fieldTree.properties[i]]);
                if (!response.success)
                {
                    return response;
                }

                data[fieldTree.properties[i]] = response.value!;
            }
        }

        if (fieldTree.nestedProperties)
        {
            const keys = Object.keys(fieldTree.nestedProperties);
            for (let i = 0; i < keys.length; i++)
            {
                if (data[keys[i]] == undefined)
                {
                    continue;
                }

                if (Array.isArray(data[keys[i]]))
                {
                    const decryptedValues: any = [];
                    const nestedProperties: any[] = data[keys[i]];

                    for (let j = 0; j < nestedProperties.length; j++)
                    {
                        const innerObject = await this.decryptEndToEndData(fieldTree.nestedProperties[keys[i]], data[keys[i]][j])
                        if (!innerObject.success)
                        {
                            return innerObject;
                        }

                        decryptedValues.push(innerObject.value!);
                    }

                    data[keys[i]] = decryptedValues;
                }
                else 
                {
                    const nestedObject = await this.decryptEndToEndData(fieldTree.nestedProperties[keys[i]], data[keys[i]]);
                    if (!nestedObject.success)
                    {
                        return nestedObject;
                    }

                    data[keys[i]] = nestedObject.value;
                }
            }
        }

        return TypedMethodResponse.success(data);
    }

    async post<T extends BaseResponse>(serverPath: string, data?: any): Promise<T | BaseResponse> 
    {
        if (!environment.cache.sessionKey)
        {
            return { Success: false, InvalidSession: true } as InvalidSessionResponse;
        }

        return super.post(serverPath, data);
    }

    protected async getRequestData(data?: any): Promise<TypedMethodResponse<EncryptedResponse>>
    {
        data.ResponsePublicKey = responseKeys.public;

        const sessionHash = await environment.sessionHandler.getSession();
        if (!sessionHash)
        {
            return TypedMethodResponse.fail(undefined, undefined, undefined, undefined, true);
        }

        const requestData = await environment.utilities.crypt.symmetricEncrypt(environment.cache.sessionKey!, JSON.vaulticStringify(data));
        if (!requestData.success)
        {
            return TypedMethodResponse.fail(undefined, undefined, requestData.errorMessage, requestData.logID);
        }

        return await environment.utilities.crypt.hybridEncrypt(JSON.vaulticStringify({
            SessionTokenHash: sessionHash,
            Data: requestData.value
        }));
    }

    protected async handleResponse<T>(response?: any): Promise<TypedMethodResponse<T>> 
    {
        let responseData: T = {} as T;
        try
        {
            const encryptedResponse: EncryptedResponse = response as EncryptedResponse;
            console.log(`Encrypted Response: ${JSON.stringify(encryptedResponse)}`);
            if (!encryptedResponse.Data)
            {
                return TypedMethodResponse.fail(undefined, "handleResponse", "No Data");
            }

            const decryptedResponse = await environment.utilities.crypt.symmetricDecrypt(environment.cache.sessionKey!, encryptedResponse.Data);
            if (!decryptedResponse.success)
            {
                return TypedMethodResponse.propagateFail(decryptedResponse, "handleResponse");
            }

            responseData = JSON.vaulticParse(decryptedResponse.value!) as T;
            return TypedMethodResponse.success(responseData);
        }
        catch (e)
        {
            return TypedMethodResponse.fail(undefined, "handleResposne", `Exception: ${e?.message}`);
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
