import { createDataSource, deleteDatabase } from "@/lib/Helpers/DatabaseHelper";
import { coreAPIResolver } from "@/lib/main/CoreAPIResolver";
import * as rendererAPI from '@/lib/renderer/API';
import { environment } from "@/lib/Main/Environment";
import { RuntimeMessages } from "@/lib/Types/RuntimeMessages";
import { CryptUtility } from "@/lib/Utilities/CryptUtility";
import { DataUtility } from "@/lib/Utilities/DataUtility";
import { generatorUtility, PromisifyGeneratorUtility } from "@/lib/Utilities/GeneratorUtility";
import { HashUtility } from "@/lib/Utilities/HashUtility";
import { DeviceInfo } from "@vaultic/shared/Types/Device";
import { CVaulticHelper } from "@/lib/Helpers/VaulticHelper";
import app from "@/lib/renderer/Objects/Stores/AppStore";
import { api } from "@/lib/renderer/API";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { LogUserInResponse } from "@vaultic/shared/Types/Responses";

export default defineBackground(() => 
{
    const apiResolver = coreAPIResolver.toPlatformDependentAPIResolver(() => Promise.resolve({} as DeviceInfo), new CVaulticHelper(), new PromisifyGeneratorUtility());
    rendererAPI.api.setAPIResolver(apiResolver);

    let currentSession: string = "";
    async function setSession(tokenHash: string): Promise<void>
    {
        currentSession = tokenHash;
    }

    async function getSession(): Promise<string>
    {
        return currentSession;
    }

    environment.init({
        isTest: false,
        sessionHandler:
        {
            setSession,
            getSession
        },
        utilities:
        {
            crypt: new CryptUtility(),
            hash: new HashUtility(),
            generator: generatorUtility,
            data: new DataUtility()
        },
        database:
        {
            createDataSource,
            deleteDatabase
        },
        getDeviceInfo: () => ({} as DeviceInfo),
        hasConnection: () => Promise.resolve(true)
    });

    // In Manifest V3, return a Promise instead of using sendResponse
    browser.runtime.onMessage.addListener((message, sender) => 
    {
        console.log(`Message received: ${message.type}`);
        
        switch (message.type) 
        {
            case RuntimeMessages.IsSignedIn:
                console.log(`Responding with loadedUser: ${app.loadedUser.value}`);
                // Return the value directly (or wrapped in Promise.resolve)
                return Promise.resolve(app.loadedUser.value);
                
            case RuntimeMessages.SignIn:
                console.log('Handling SignIn request');
                // Return the Promise directly
                return signUserIn(message.email, message.masterKey, message.mfaCode)
                    .then(response => {
                        console.log('SignIn response:', response);
                        return response;
                    })
                    .catch(error => {
                        console.error('SignIn error:', error);
                        return { success: false, error: error.message };
                    });
                
            default:
                console.warn(`Unknown message type: ${message.type}`);
                return Promise.resolve({ success: false, error: 'Unknown message type' });
        }
    });
});

async function signUserIn(email: string, masterKey: string, mfaCode?: string): Promise<TypedMethodResponse<LogUserInResponse | undefined>>
{
    console.log(`Signing user in with email: ${email}, masterKey: ${masterKey}, mfaCode: ${mfaCode}`);
    const response = await api.helpers.server.logUserIn(masterKey, email, false, false, mfaCode);
    if (response.success && response.value!.Success)
    {
        app.isOnline = true;

        // used to hide the editing UI components so its not as glitchy when logging in
        app.forceReadOnlyVal = true;

        if (response.value?.masterKey)
        {
            if (await app.loadUserData(response.value?.masterKey!))
            {
                app.popups.hideLoadingIndicator();
                app.syncVaults(response.value?.masterKey!, email, true, false);
            }
        }
        else
        {
            if (!(await app.syncAndLoadUserData(masterKey, email, false)))
            {
                return TypedMethodResponse.failWithValue(response.value);
            }   
        } 
        
        app.forceReadOnlyVal = false;
        return TypedMethodResponse.success(response.value);
    }

    return response;
}