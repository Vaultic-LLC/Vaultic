// Import localforage and sql.js and expose them globally for TypeORM sql.js driver
import localforage from 'localforage';
import initSqlJs from 'sql.js';

(globalThis as any).localforage = localforage;

import { coreAPIResolver } from "@/lib/main/CoreAPIResolver";
import { createDataSource, deleteDatabase } from "@/lib/Helpers/DatabaseHelper";
import * as rendererAPI from '@/lib/renderer/API';
import { environment } from "@/lib/main/Environment";
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
import { OH } from '@vaultic/shared/Utilities/PropertyManagers';

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
                    case RuntimeMessages.Lock:
                        app.lock();
                        break;
                    
                    case RuntimeMessages.Sync:
                        const masterKey = await api.repositories.users.getValidMasterKey();
                        response = await app.syncVaults(masterKey!, app.userInfo!.email!);
                        break;
                        
                    case RuntimeMessages.IsSignedIn:
                        console.log(`Responding with loadedUser: ${app.loadedUser.value}`);
                        response = app.loadedUser.value;
                        break;
                        
                    case RuntimeMessages.SignIn:
                        console.log('Handling SignIn request');
                        response = await signUserIn(message.email, message.masterKey, message.mfaCode);
                        console.log('SignIn response:', response);
                        break;

                    case RuntimeMessages.GetVaultAndUserData:
                        response = 
                        {
                            vaultData: app.currentVault.toCondensedVaultData(),
                            userPreferences: JSON.stringify(app.userPreferences.getState()),
                        };
                        break;

                    case RuntimeMessages.GetDataBreaches:
                        response = 
                        {
                            failedToLoadDataBreaches: app.vaultDataBreaches.failedToLoadDataBreaches,
                            loadedDataBreaches: app.vaultDataBreaches.loadedDataBreaches,
                            state: JSON.stringify(app.vaultDataBreaches.getState())
                        }
                        break;

                    case RuntimeMessages.GetVaults:
                        response = app.userVaults.value;
                        break;

                    case RuntimeMessages.GetCurrentVault:
                        response = app.userVaultsByVaultID.get(app.currentVault.vaultID);
                        break;

                    case RuntimeMessages.GetVaultByVaultID:
                        response = app.userVaultsByVaultID.get(message.vaultID);
                        break;

                    case RuntimeMessages.GetVaultByUserVaultID:
                        response = app.userVaults.value.find(v => v.userVaultID === message.userVaultID);
                        break;
                    
                    case RuntimeMessages.LoadVault:
                        const loadVaultKey = await api.repositories.users.getValidMasterKey();
                        response = await app.setActiveVault(loadVaultKey!, message.userVaultID);
                        break;

                    case RuntimeMessages.GetPasswordsByDomain:
                        response = [];
                        console.log(`Getting passwords by domain: ${message.domain}, Passwords By Domain: ${JSON.stringify(app.currentVault?.passwordsByDomain)}`);
                        if (app.currentVault?.passwordsByDomain !== undefined)
                        {
                            OH.forEachKey(app.currentVault.passwordsByDomain, (domain: string) => 
                            {
                                console.log(`Domain: ${domain}, Message Domain: ${message.domain}`);
                                if (domain.includes(message.domain) || message.domain.includes(domain))
                                {
                                    OH.forEachKey(app.currentVault.passwordsByDomain![domain], (password: string) => 
                                    {
                                        console.log(`Password: ${password}, Passwords By ID: ${JSON.stringify(app.currentVault.passwordStore.passwordsByID)}`);
                                        const tempPassword: { email?: string, id?: string } = { email: undefined, id: undefined};

                                        tempPassword.id = password;
                                        tempPassword.email = app.currentVault.passwordStore.passwordsByID[password].e;

                                        response.push(tempPassword);
                                    });
                                }
                            });
                        }
                        break;
                    
                    case RuntimeMessages.GetPasswordData:
                        const key = await api.repositories.users.getValidMasterKey();
                        const decryptedPassword = await environment.utilities.crypt.symmetricDecrypt(key!, app.currentVault.passwordStore.passwordsByID[message.id].p);
                        response = decryptedPassword;
                        break;

                    case RuntimeMessages.AddPassword:
                        response = await app.currentVault.passwordStore.addPassword(message.masterKey, message.password, message.addedSecurityQuestions, message.pendingPasswordStoreState);
                        break;
                    
                    case RuntimeMessages.UpdatePassword:
                        response = await app.currentVault.passwordStore.updatePassword(message.masterKey, message.updatingPassword, message.passwordWasUpdated, message.addedSecurityQuestions, message.updatedSecurityQuestionQuestions, message.updatedSecurityQuestionAnswers, message.deletedSecurityQuestions, message.addingGroups, message.pendingPasswordState);
                        break;
                    
                    case RuntimeMessages.DeletePassword:
                        response = await app.currentVault.passwordStore.deletePassword(message.masterKey, message.password);
                        break;

                    case RuntimeMessages.AddValue:
                        response = await app.currentVault.valueStore.addNameValuePair(message.masterKey, message.value, message.pendingValueStoreState);
                        break;
                    
                    case RuntimeMessages.UpdateValue:
                        response = await app.currentVault.valueStore.updateNameValuePair(message.masterKey, message.updatedValue, message.valueWasUpdated, message.groups, message.pendingValueStoreState);
                        break;

                    case RuntimeMessages.DeleteValue:
                        response = await app.currentVault.valueStore.deleteNameValuePair(message.masterKey, message.value);
                        break;
                    
                    case RuntimeMessages.AddFilter:
                        response = await app.currentVault.filterStore.addFilter(message.masterKey, message.filter, message.pendingFilterState);
                        break;

                    case RuntimeMessages.UpdateFilter:
                        response = await app.currentVault.filterStore.updateFilter(message.masterKey, message.updatedFilter, message.addedConditions, message.removedConditions, message.pendingFilterState);
                        break;
                    
                    case RuntimeMessages.DeleteFilter:
                        response = await app.currentVault.filterStore.deleteFilter(message.masterKey, message.filter);
                        break;

                    case RuntimeMessages.AddGroup:
                        response = await app.currentVault.groupStore.addGroup(message.masterKey, message.group, message.pendingStoreState);
                        break;
                    
                    case RuntimeMessages.UpdateGroup:
                        response = await app.currentVault.groupStore.updateGroup(message.masterKey, message.updatedGroup, message.updatePrimaryObjects, message.pendingGroupStoreState);
                        break;

                    case RuntimeMessages.DeleteGroup:
                        response = await app.currentVault.groupStore.deleteGroup(message.masterKey, message.group);
                        break;
                    
                    case RuntimeMessages.ToggleFilter:
                        await app.userPreferences.toggleFilter(message.id);
                        response = true;
                        break;

                    case RuntimeMessages.DismissVaultDataBreach:
                        response = await app.vaultDataBreaches.dismissVaultDataBreach(message.vaultDataBreachID);
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