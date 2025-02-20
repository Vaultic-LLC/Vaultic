import axios, { AxiosError, AxiosInstance } from 'axios';
import vaulticServer from './VaulticServer';
import { environment } from '../Environment';
import { FieldTree } from '../Types/FieldTree';
import { DeviceInfo } from '@vaultic/shared/Types/Device';
import { TypedMethodResponse } from '@vaultic/shared/Types/MethodResponse';
import { BaseResponse, EncryptedResponse, InvalidSessionResponse } from '@vaultic/shared/Types/Responses';
import { Algorithm, AsymmetricVaulticKey, MLKEM1024KeyResult, PublicPrivateKey, VaulticKey } from '@vaultic/shared/Types/Keys';
import { nameof } from '@vaultic/shared/Helpers/TypeScriptHelper';
import { User } from '../Database/Entities/User';

const APIKeyEncryptionKey = JSON.stringify({ algorithm: Algorithm.XCHACHA20_POLY1305, key: "12fasjkdF2owsnFvkwnvwe23dFSDfio2" });
const apiKeyPrefix = "ThisIsTheStartOfTheAPIKey!!!Yahooooooooooooo1234444321-";

let vaulticServerPublicKey: string;
let salt: string;

let deviceInfo: DeviceInfo;
let axiosInstance: AxiosInstance;

// Don't move in cache so I don't have to worry about changing keys while requests may still be in transit
let responseKeys: PublicPrivateKey<string>;

// can't access environment before it has been initalized
function init()
{
    deviceInfo = environment.getDeviceInfo();
    responseKeys = environment.utilities.crypt.generatePublicPrivateKeys(Algorithm.ML_KEM_1024);

    const vaulticKey: AsymmetricVaulticKey =
    {
        algorithm: Algorithm.ML_KEM_1024,
        symmetricAlgorithm: Algorithm.XCHACHA20_POLY1305,
        key: "e90bcfd8c6cf94d1667c7acd76a157b1e40150049ac318141c672431e37524e64643c32ed3a773bbac6d869b4c30035ff0f9aa73606e4c2934ab9532c0b570aa2545c76a0830ca8acf96b96ec2229065512efc1cb80027823b6bdee929cd04ba653129ba60c38520168ec9c286f08351a93810c866492c0b4e580d1dd261622495820bcd45a98441177d745badc59b462c085e15f30446458757004979aac8fa640f46e23a211974e60577eabc705e238c9055725b377953f10723535b67dc9797469075970bcd2616aef7711e62120d96746190b5edd55624e0ac60782bfa31ad0c2bc03fe9b4ba5a1f47314840f78362f75aa730aaa686278bcbad8d7c06a2335ba47c77fac65d7161c85e2955acb23969e769207491c4749bad87c8cb8460d49b844c874679b31ff3174f56745dd094b570681350496328600e1ef9170eaab92c23743823c3b320774a73b13fe90d41284e51db9136641d51e8908fe3b09f8c65e138a6c1f4334ce77cf51ac207eabbe619cca12b0c1c73a3a611aabc6614ae8225b747bd30e5ae808b72dcc69b42b811e13274ff875754f76045e574de07537d66a8337c6deca4727e60428fdbcbfeaab305bb0317d40305f10b65c3095a726549c0b71bf7bc10178befc03b00d71473686bab1a3d11708839692a4b9934b79942b0a959f9932b6cf4b2936061727345e68308059b42249a8d004a5eb23436cb37607787c8cd79ab47f59f58138034218af1f294d514b3d6f5ad6dc01695baa58f9895a5e103875051671bae88e55660eb7798e139c1a6404ed88f97374fa049455e6a35498932ab9877e5db1cfae41912b75bd31956b4c16fc030aa5b8057343410dd2109c60831179c6307761a719163ea132857f366c4b51da2a453ea76065ec12bcfd28cd7518068a699375ccc4a671878b230fabc60278480c0f48cb0a264ab8675d94881e6665e1cdb1e4af454e24c4cd4764231b59e2fea42878bbb676b870ba74193284499f9b7ea3b21d6bb9f29e21a16644a48c1aac11760cd45719c04465552af84c2cf5afa4e272a22698b743356a3e4a3bbbc5c4344e70f8b6ac100a3b119e4cacf0185517363168b4be4377178d918f3f41dfb9885b538640a86a32a9cb7a9bc27bb180dc44b2cc73b5b07fc28a4135cefcb9e7c754f2a9527c0c08e5f5069c39a75be9445d4282dcaec58e415c5bc2a6033a4214e8b9fd041a1a6c78f5323141b287e5e7c5da46434fae0567727b53124b84a61714099976c934ebff493268c38c3602f6085bf7df3333f38aefc496e0260a8b1ac30c6a9bad37b970709b8fe87192409805fb126b9314c5dea3c0e0a94a431323f33950746ad6df81c7fd5cb06444f05e4c142e91132b76c4f9bc3c168cd0fbaac37b778562445da941ea00a3544625239e3cd248228deb572c08c4504ca2eff403047987ba2ab1ee658cb9bb54f1704ab589c9d7df22e68e198deb025fc287107096d5f2a9471dcacdf252feaf84ffae295528ba490087661565d46839f92a4722b539dc245ba66c3bf416b0108a8bb756b8e1ff374a865308892325d69add46742f22c7807bb95dde970c51770ac3ca649d61e95a5963c9922cefa34c5e973d6fcb34df229b971054d232be1832d369a2c4f28978b945d0f971e3fbc194718ab7db7bdbe81c643d2aeb6756e7567ba42057529357075376c96d67b202b5165d790c07031ee171068c54957f12aa4d33c4a37988ad602e1017726399fdc93cef2bbb29d37bb7acbce054cb0d90b822eb776a7c60ff95acc0364c699788364c1b6d8c991dce864ea673ff916a6aadc2a9b6099c1db329f2c7c323817b9a749a2d3ac104a43a117cf97692a649b75ecc4568f62b90e62ca4fec544e4a9245175d52dc28fc1206ff783f8290a5cb2173a4fba0000ac51c62b8e3637a3d7187b551131f6c4734f00ce1379ead5acda8422ad1393e34b7c3086c9ecf86c9fcd581e9441774537d01539f58fa45e96c475ce46dabdca72215ac64c683b752a608270f327c1057d69de0ca27aba25de1057321b680a736628b5b7335c82d82806f7ae68b8dc4c20871869ed9483d00245efc232f079a80da022baac476d8ba26265bb775667fd59ec5251e48bb08ceda9d9d703915e021d81972ffa24138cac7d1728a13a73080789549febe296ac11a16a54b9e9336783e345b0cba4fd5a0b5487778bcd113"
    };

    vaulticServerPublicKey = JSON.vaulticStringify(vaulticKey);
    salt = environment.utilities.crypt.randomStrongValue(60);

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

        const result = await environment.utilities.crypt.asymmeticEncrypt(vaulticServerPublicKey, JSON.vaulticStringify(data));
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
            const decryptedResponse = await environment.utilities.crypt.asymmetricDecrypt(responseKeys.private, encryptedResponse.Data, encryptedResponse.CipherText);

            if (!decryptedResponse.success)
            {
                return TypedMethodResponse.propagateFail(decryptedResponse, "handleResponse");
            }

            const { Salt, ...responseData } = JSON.vaulticParse(decryptedResponse.value!) as BaseResponse;
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
        if (!environment.cache.exportKey)
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
        if (!environment.cache.exportKey)
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

                const response = await environment.utilities.crypt.symmetricDecrypt(environment.cache.exportKey, data[fieldTree.properties[i]]);
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
        if (!environment.cache.sessionKey)
        {
            return { Success: false, InvalidSession: true } as InvalidSessionResponse;
        }

        return super.post(serverPath, data);
    }

    protected async getRequestData(data?: any): Promise<TypedMethodResponse<EncryptedResponse | undefined>>
    {
        // ResponsePublicKey is requried for BaseRequest to be valid on the server
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

        const formattedData =
        {
            SessionTokenHash: sessionHash,
            Data: requestData.value
        };

        // Use asymmetric encryption when sending to the server to hide the SessionTokenHash
        const encryptedData = await environment.utilities.crypt.asymmeticEncrypt(vaulticServerPublicKey, JSON.vaulticStringify(formattedData));
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
