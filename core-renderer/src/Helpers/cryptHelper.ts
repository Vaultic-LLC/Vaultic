import { MethodResponse } from "../Types/EncryptedData";
import app from "../Objects/Stores/AppStore";
import { api } from "../API";

export interface CryptHelper
{
    encrypt: (key: string, value: string) => Promise<MethodResponse>;
    decrypt: (key: string, value: string) => Promise<MethodResponse>;
}

async function encrypt(key: string, value: string): Promise<MethodResponse>
{
    const result = await api.utilities.crypt.encrypt(key, value);
    if (!result.success)
    {
        app.popups.showErrorAlert(result.logID);
    }

    return result;
}

async function decrypt(key: string, value: string): Promise<MethodResponse>
{
    // This is expected to fail if the user enters the wrong key, don't show the error popup
    return await api.utilities.crypt.decrypt(key, value);
}

const cryptHelper: CryptHelper = {
    encrypt,
    decrypt
}

export default cryptHelper;
