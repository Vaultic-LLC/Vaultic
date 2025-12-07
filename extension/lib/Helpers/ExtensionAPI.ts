import { DeviceInfo } from "@vaultic/shared/Types/Device";
import { coreAPIResolver } from "../main/CoreAPIResolver";
import { CVaulticHelper } from "./VaulticHelper";
import { PromisifyGeneratorUtility } from "../Utilities/GeneratorUtility";
import * as rendererAPI from '@/lib/renderer/API';
import { RuntimeMessages } from "../Types/RuntimeMessages";

export default function setExtensionAPI()
{
    const apiResolver = coreAPIResolver.toPlatformDependentAPIResolver(() => Promise.resolve({} as DeviceInfo), new CVaulticHelper(), new PromisifyGeneratorUtility());

    apiResolver.repositories.users.getValidMasterKey = async () => 
    {
        return await browser.runtime.sendMessage({
            type: RuntimeMessages.GetValidMasterKey,
        });
    }

    apiResolver.utilities.crypt.symmetricDecrypt = async (key: string, value: string) => 
    {
        return await browser.runtime.sendMessage({
            type: RuntimeMessages.SymmetricDecrypt,
            masterKey: key,
            encryptedValue: value,
        });
    }

    rendererAPI.api.setAPIResolver(apiResolver);
}