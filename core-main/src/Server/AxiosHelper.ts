import axios, { AxiosError, AxiosInstance } from 'axios';
import { FieldTree } from '../Types/FieldTree';
import { DeviceInfo } from '@vaultic/shared/Types/Device';
import { TypedMethodResponse } from '@vaultic/shared/Types/MethodResponse';
import { BaseResponse, EncryptedResponse, InvalidSessionResponse } from '@vaultic/shared/Types/Responses';
import { Algorithm, AsymmetricVaulticKey, MLKEM1024KeyResult, PublicPrivateKey } from '@vaultic/shared/Types/Keys';
import errorCodes from '@vaultic/shared/Types/ErrorCodes';
import { Environment } from '../Types/Environment';

let vaulticServerPublicKey: string;
let salt: string;

let deviceInfo: DeviceInfo;
let axiosInstance: AxiosInstance;

// Don't move in cache so I don't have to worry about changing keys while requests may still be in transit
let responseKeys: PublicPrivateKey<string>;

// can't access environment before it has been initalized
export function init(environment: Environment)
{
    deviceInfo = environment.getDeviceInfo();
    responseKeys = environment.utilities.crypt.generatePublicPrivateKeys(Algorithm.ML_KEM_1024);
    
    const vaulticKey: AsymmetricVaulticKey =
    {
        algorithm: Algorithm.ML_KEM_1024,
        symmetricAlgorithm: Algorithm.XCHACHA20_POLY1305,
        key: "3a0b6bd80c8dae90087820173eac1855768d6b4631dac0347be5a0f4092fa2243817c19e7ef74ca18030f540a2bbea4d004db32d393286bb5576828dfa0588fa305e9a323b12f86df8dc2cc933100cc62eca9a4c83a9a93a76c9bcbc826b6173bb047d35938344e3197da93642b60e3a4a9cd8f5b011538d331a8c29153f8f560c59f31add79a2aefb5b7f895488ba85d0f36ce7b460dde51377414338c6881ca670316824c394a8bd310be2c694c1483f8d686f5af633ca1cb47bb1c98515cea0f11d5c44bf06588b132c1b588942d432080ccc16330329b414406775ccb7aab7ad389ddbb1399a11055998b210c46fd50998779185cd64a7e906c1b7db7a3da089c037bdae7686c9b5bd90cac046e03aa2d832acd4c8af4b681a12a1a8916d15360c0c686ab5dc98d90013a73b435349b41185957557084d5185b12ca0f155bec9128017a466a2282a8e997d4c604f5b9a9d92d8415e50471fd09dbbd6275ecaa4efdc326c3b10efda6c9ddc85707559a3a62a74e19cc7c78e6055671c512afb19b821602c825641d3ec0bc5184591357b48d9afcce9b229953b385b861b40176aa620fbe6073039558bfb81e181567507987ec4b81ef06011a896f9ca83636b931cb82bad6b8a51267352c6575d3856e092b89f490a14500e75339c7be077a63b86f067134b48cec947422ad86bf1eb1af5fc80b744b2ad0a4c3909a41541c22e98a1440880ca4750962001ddd4b052a17df632277bd4212fb1cb5a4b6b0776107c0a2c810b07ca5344b154075959c9195cb4edc910735c72e1d6b401d91197692892ab99e8439eb1d150e0a1236e0c98b74a98d9c434e62089c9521dcb7c0c2c290af272cf6c257f5068aedad497ba3a0d3fb61b3e360b15c72b65334119ec94499c3f11701cf32b1209a8b462b79b4bb45a6f72b550a4953bc98a5ca2b4a5868060e9c7bf0467c1b23b0f54806d9b98b03a05660327e128519cb4a5c2961d28e693885aba9a4228954665161682914228cd333d4972bc00ec815e97bb421048cf7154bc1a1a57a36a466c27fd4c9776b08981242c486197422105c0703f11ab87df07181162611d709e6a7c9d40f2c224084f88f514b1d80b7f1983baa72c24a706797552addcb428a27d61fa4f0e56478f45a752088ec773c7eac305d0aab788b97c92e8a9395285eb88575be6b45d50253ac086a815673c17295f111b7338ccf57430c1c3aef527614ab84dd0649f80897db1767e5fda01e1715e01763c0286a974c6bd4d68ba319707ec86ac5321cc8257619f97a04848a5164460f8d9b008c2395f16691ae79bb38c3addf628e4b7ac1b078f39480bd89bba9e47b45760b71b97a875149cf24c84bdb4ca8749c43f03570a1524d3a39883c2abb6fb5511279323831cd1e1648d483e837455e64131d8b555a768bc796c29a3a088c0bc4043056ea3468da3f67c5e19a46c06ca09e931fab35309623afccb5c9601cf50f82ce2b268152aa98ef355e94259abf1a1d6e025a07a6178b50a0b2761836b28bf6a67293686fed23a7061c480500e69b66aab8b0cd58293b66097f6878e8353ca85ca2d47f92cdafc07afa79240e5864dc9106068bb329a71b9b8b534439b91b85fb45935ac7211f499a058f8c10c701e19eb7287105004e34d05034e215731bd10238f205b3bd0c271636fe45950dba733bf3c39a298679e135efe5c58842694b604a151cb37ff07501a4437e678b2dc200be25cb71789414bdb2fa0b2517a94a00f886ffe5750d101859da3219f820ffe925dca1c205220547702b8096755688b7379331194c257682c0fffc759bb837e908831903407484b557b30394ee4211e871f7a586d59f1a2491c7a45ca81ee424a880983aaa50cc5106513f72fb85b590b685b832b49b5f58d62c767cd69a24d6c4559c62cc5688fd6fa5ad5cc107cc07f0c77c25e47aa4c3678b98886c1785a5ae86dffe4a39000b06f0a8273eb0e61b7b0da3abc7669b39eb53bfa34123b9c875cbc1f18e13c1a438f68cc30ea9b87210854c90c08fd6b3cc6cc3d76d173c2f438efa0ae5806b21d250e73554cef1b2a21a19e0a6098087830570404ca1828e116709c570e5b5ba4db791689b8ce5fd4acdd65ac32c21c2b9c8186e1c57b62b70075784a9a9c4a232fdff713144a7ac7ddeaaa4ed4cd98791af733fb1a27d9f881b0695f06ee63822cc97b7c"
    };

    vaulticServerPublicKey = JSON.stringify(vaulticKey);
    salt = environment.utilities.crypt.randomStrongValue(60);

    if (environment.isTest)
    {
        stsAxiosHelper.init(environment, 'https://localhost:7088/');
        apiAxiosHelper.init(environment, 'https://localhost:7007/');
    }
    else
    {
        stsAxiosHelper.init(environment, 'https://vaultic-sts.vaulticserver.vaultic.co/');
        apiAxiosHelper.init(environment, 'https://vaultic-api.vaulticserver.vaultic.co/');
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
    protected environment: Environment;

    constructor() { }

    init(environment: Environment, url: string)
    {
        if (this.initalized)
        {
            return;
        }

        this.initalized = true;
        this.environment = environment;
        this.url = url;
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
                const responseResult = await this.handleResponse(response.data);

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
                    returnResponse = { Success: false, UnknownError: true, logID: requestData.logID };
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
        await this.environment.repositories.logs.log(undefined, JSON.stringify({ result: returnResponse, endpoint: serverPath }), "AxiosHelper");
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
                newData = JSON.parse(data);
            }
        }
        catch (e: any)
        {
            if (e?.error instanceof Error)
            {
                const error: Error = e?.error as Error;
                const response = await this.environment.repositories.logs.log(undefined, error.message, "AxiosHelper.GetRequestData");
                if (response)
                {
                    return [{ success: false }, { Key: '', Data: '' }]
                }
            }
        }

        newData.MacAddress = deviceInfo.mac;
        newData.DeviceName = deviceInfo.deviceName;
        newData.Model = deviceInfo.model;
        newData.Version = deviceInfo.version;

        return newData;
    }

    protected async getRequestData(data?: any): Promise<TypedMethodResponse<EncryptedResponse | undefined>>
    {
        return {} as TypedMethodResponse<EncryptedResponse>;
    }

    protected async handleResponse(response?: any): Promise<TypedMethodResponse<BaseResponse>>
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

    protected async getRequestData(data?: any): Promise<TypedMethodResponse<EncryptedResponse | undefined>>
    {
        // we don't have our session key yet, use hybrid encryption to encrypt the post data
        data.ResponsePublicKey = responseKeys.public;
        data.Salt = salt;

        const result = await this.environment.utilities.crypt.asymmeticEncrypt(vaulticServerPublicKey, JSON.stringify(data));
        if (!result.success)
        {
            return TypedMethodResponse.propagateFail(result);
        }

        const mlKEMResult = result.value as MLKEM1024KeyResult;

        return TypedMethodResponse.success({
            CipherText: mlKEMResult.cipherText,
            Data: mlKEMResult.value
        });
    }

    protected async handleResponse(response?: any): Promise<TypedMethodResponse<BaseResponse>> 
    {
        try
        {
            if (!response)
            {
                return TypedMethodResponse.fail(undefined, undefined, "No Response");
            }

            if (!('CipherText' in response) || !('Data' in response))
            {
                return TypedMethodResponse.fail(undefined, undefined, "No CipherText or Data");
            }

            const encryptedResponse: EncryptedResponse = response as EncryptedResponse;
            const decryptedResponse = await this.environment.utilities.crypt.asymmetricDecrypt(responseKeys.private, encryptedResponse.Data, encryptedResponse.CipherText);

            if (!decryptedResponse.success)
            {
                return TypedMethodResponse.propagateFail(decryptedResponse, "handleResponse");
            }

            const { Salt, ...responseData } = JSON.parse(decryptedResponse.value!) as BaseResponse;
            if (!Salt || Salt != salt)
            {
                return TypedMethodResponse.fail(undefined, undefined, "Incorrect Salt");
            }

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
        if (!this.environment.cache.exportKey)
        {
            return TypedMethodResponse.fail(undefined, undefined, "No Export Key");
        }

        if (fieldTree.canCrypt && !fieldTree.canCrypt(data))
        {
            return TypedMethodResponse.success(data);
        }

        if (fieldTree.properties)
        {
            for (let i = 0; i < fieldTree.properties.length; i++)
            {
                if (data[fieldTree.properties[i]] == undefined)
                {
                    continue;
                }

                const response = await this.environment.utilities.crypt.symmetricEncrypt(this.environment.cache.exportKey, data[fieldTree.properties[i]]);
                if (!response.success)
                {
                    return response.addToErrorMessage(`Prop: ${fieldTree.properties[i]}`);
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

                        if (innerObject.value)
                        {
                            encryptedValues.push(innerObject.value!);
                        }
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

                    if (innerObject.value)
                    {
                        data[keys[i]] = innerObject.value!;
                    }
                }
            }
        }

        return TypedMethodResponse.success(data);
    }

    async decryptEndToEndData(fieldTree: FieldTree, data: { [key: string]: any }): Promise<TypedMethodResponse<any>>
    {
        if (!this.environment.cache.exportKey)
        {
            return TypedMethodResponse.fail(undefined, undefined, "No Export Key");
        }

        if (fieldTree.canCrypt && !fieldTree.canCrypt(data))
        {
            return TypedMethodResponse.success(data);
        }

        if (fieldTree.properties)
        {
            for (let i = 0; i < fieldTree.properties.length; i++)
            {
                if (!data[fieldTree.properties[i]])
                {
                    continue;
                }

                try
                {
                    const response = await this.environment.utilities.crypt.symmetricDecrypt(this.environment.cache.exportKey, data[fieldTree.properties[i]]);
                    if (!response.success)
                    {
                        return TypedMethodResponse.fail(undefined, undefined, `Failed to e2e decrypt: ${fieldTree.properties[i]}`);
                    }

                    data[fieldTree.properties[i]] = response.value!;
                }
                catch 
                {
                    return TypedMethodResponse.fail(errorCodes.E2E_DECRYPTION_FAILED, undefined, `Failed to e2e decrypt: ${fieldTree.properties[i]}`);
                }
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

                        if (innerObject.value)
                        {
                            decryptedValues.push(innerObject.value!);
                        }
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

                    if (nestedObject.value)
                    {
                        data[keys[i]] = nestedObject.value;
                    }
                }
            }
        }

        return TypedMethodResponse.success(data);
    }

    async post<T extends BaseResponse>(serverPath: string, data?: any): Promise<T | BaseResponse> 
    {
        if (!this.environment.cache.sessionKey)
        {
            return { Success: false, InvalidSession: true } as InvalidSessionResponse;
        }

        return super.post(serverPath, data);
    }

    protected async getRequestData(data?: any): Promise<TypedMethodResponse<EncryptedResponse | undefined>>
    {
        // ResponsePublicKey is requried for BaseRequest to be valid on the server
        data.ResponsePublicKey = responseKeys.public;

        const sessionHash = await this.environment.sessionHandler.getSession();
        if (!sessionHash)
        {
            return TypedMethodResponse.fail(undefined, undefined, undefined, undefined, true);
        }

        const requestData = await this.environment.utilities.crypt.symmetricEncrypt(this.environment.cache.sessionKey!, JSON.stringify(data));
        if (!requestData.success)
        {
            return TypedMethodResponse.fail(undefined, undefined, requestData.errorMessage, requestData.logID);
        }

        const formattedData =
        {
            SessionTokenHash: sessionHash,
            Data: requestData.value
        };

        // Use asymmetric encryption when sending to the server to hide the SessionTokenHash
        const encryptedData = await this.environment.utilities.crypt.asymmeticEncrypt(vaulticServerPublicKey, JSON.stringify(formattedData));
        if (!encryptedData.success)
        {
            return TypedMethodResponse.propagateFail(encryptedData);
        }

        const mlKEMResult = encryptedData.value as MLKEM1024KeyResult;
        return TypedMethodResponse.success({ CipherText: mlKEMResult.cipherText, Data: mlKEMResult.value });
    }

    protected async handleResponse<T>(response?: any): Promise<TypedMethodResponse<T>> 
    {
        let responseData: T = {} as T;
        try
        {
            const encryptedResponse: EncryptedResponse = response as EncryptedResponse;
            if (!encryptedResponse.Data)
            {
                return TypedMethodResponse.fail(undefined, "handleResponse", "No Data");
            }

            const decryptedResponse = await this.environment.utilities.crypt.symmetricDecrypt(this.environment.cache.sessionKey!, encryptedResponse.Data);
            if (!decryptedResponse.success)
            {
                return TypedMethodResponse.fail(undefined, "Handle Response");
            }

            responseData = JSON.parse(decryptedResponse.value!) as T;
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
    api: APIAxiosWrapper;
    sts: STSAxiosWrapper;
}

const apiAxiosHelper = new APIAxiosWrapper();
const stsAxiosHelper = new STSAxiosWrapper();

const axiosHelper: AxiosHelper =
{
    api: apiAxiosHelper,
    sts: stsAxiosHelper
};

export default axiosHelper;
