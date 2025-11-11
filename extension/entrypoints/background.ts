// Import localforage and sql.js and expose them globally for TypeORM sql.js driver
import localforage from 'localforage';
import initSqlJs from 'sql.js';

(globalThis as any).localforage = localforage;

import { coreAPIResolver } from "@/lib/main/CoreAPIResolver";
import { createDataSource, deleteDatabase } from "@/lib/Helpers/DatabaseHelper";
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
    // Initialize sql.js and expose it globally for TypeORM
    const initializeSqlJs = async () => {
        if (!(globalThis as any).initSqlJs) {
            const SQL = await initSqlJs({
                // Use the CDN version for the wasm file
                locateFile: (file: string) => `https://sql.js.org/dist/${file}`
            });
            (globalThis as any).SQL = SQL;
            (globalThis as any).initSqlJs = () => Promise.resolve(SQL);
        }
    };
    
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

    let isInitialized = false;
    const initPromise = initializeSqlJs().then(() => {
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
            getDeviceInfo: () => ({
                deviceName: "Vaultic",
                model: "Vaultic",
                version: "1.0.0",
                platform: "extension",
                mac: "00:00:00:00:00:00"
            } as DeviceInfo),
            hasConnection: () => Promise.resolve(true)
        });
        isInitialized = true;
    });

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => 
    {
        // TOOD: verify sender is from the extension
        console.log(`Message received: ${message.type}, from: ${JSON.stringify(sender)}`);
        
        // Handle async processing
        (async () => {
            try {
                // Ensure initialization is complete before handling messages
                await initPromise;
                console.log('Initialization complete, processing message');
                
                let response;
                switch (message.type) 
                {
                    case RuntimeMessages.IsSignedIn:
                        console.log(`Responding with loadedUser: ${app.loadedUser.value}`);
                        response = app.loadedUser.value;
                        break;
                        
                    case RuntimeMessages.SignIn:
                        console.log('Handling SignIn request');
                        response = await signUserIn(message.email, message.masterKey, message.mfaCode);
                        console.log('SignIn response:', response);
                        break;

                    case RuntimeMessages.GetColorPalette:
                        response = app.userPreferences.currentColorPalette;
                        break;

                    case RuntimeMessages.GetColorPalette:
                        response = app.userVaults.value;
                        break;
                        
                    default:
                        console.warn(`Unknown message type: ${message.type}`);
                        response = { success: false, error: 'Unknown message type' };
                        break;
                }
                
                console.log('Sending response:', response);
                sendResponse(response);
            } catch (error: any) {
                console.error('Error handling message:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        
        // Return true to indicate we will send a response asynchronously
        return true;
    });
});

async function signUserIn(email: string, masterKey: string, mfaCode?: string): Promise<TypedMethodResponse<LogUserInResponse | undefined>>
{
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
            else 
            {
                return TypedMethodResponse.failWithValue({ Success: false, message: "Failed to load user data" });
            }
        }
        else
        {
            if (!(await app.syncAndLoadUserData(masterKey, email, false)))
            {
                return TypedMethodResponse.failWithValue({ Success: false, message: "Failed to sync and load user data" });
            }   
        } 
        
        app.forceReadOnlyVal = false;
        return TypedMethodResponse.success(response.value);
    }

    return response;
}