import app from "../Objects/Stores/AppStore";
import { api } from "../API";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";

export interface CryptHelper
{
    encrypt: (key: string, value: string) => Promise<TypedMethodResponse<string>>;
    decrypt: (key: string, value: string) => Promise<TypedMethodResponse<string>>;
}

// TODO: is this actually needed?
async function encrypt(key: string, value: string): Promise<TypedMethodResponse<string>>
{
    const result = await api.utilities.crypt.encrypt(key, value);
    if (!result.success)
    {
        app.popups.showErrorAlert(result.logID);
    }

    return result;
}

async function decrypt(key: string, value: string): Promise<TypedMethodResponse<string>>
{
    // This is expected to fail if the user enters the wrong key, don't show the error popup
    return await api.utilities.crypt.decrypt(key, value);
}

const cryptHelper: CryptHelper =
{
    encrypt,
    decrypt
};

export default cryptHelper;
