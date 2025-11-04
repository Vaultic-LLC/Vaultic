import app from "../Objects/Stores/AppStore";
import { api } from "../API";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";

export interface CryptHelper
{
    encrypt: (key: string, value: string) => Promise<TypedMethodResponse<string | undefined>>;
    decrypt: (key: string, value: string) => Promise<TypedMethodResponse<string | undefined>>;
}

async function encrypt(key: string, value: string): Promise<TypedMethodResponse<string | undefined>>
{
    const result = await api.utilities.crypt.symmetricEncrypt(key, value);
    if (!result.success)
    {
        app.popups.showErrorAlert();
    }

    return result;
}

async function decrypt(key: string, value: string): Promise<TypedMethodResponse<string | undefined>>
{
    // This is expected to fail if the user enters the wrong key, don't show the error popup
    return await api.utilities.crypt.symmetricDecrypt(key, value);
}

const cryptHelper: CryptHelper =
{
    encrypt,
    decrypt
};

export default cryptHelper;
