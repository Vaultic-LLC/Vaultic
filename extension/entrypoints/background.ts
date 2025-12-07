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
import { RandomValueType } from "@vaultic/shared/Types/Fields";
import { defaultPassword, Password } from '@/lib/renderer/Types/DataTypes';
import { PendingStoreState } from '@vaultic/shared/Types/Stores';
import { IPasswordStoreState, PasswordStoreStateKeys } from '@/lib/renderer/Objects/Stores/PasswordStore';

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
            isTest: true,
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

    let temporaryPassword: { domain: string, password: string } | undefined = undefined;
    let sessionInterval: NodeJS.Timeout | undefined = undefined;

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => 
    {
        if (sender.id !== browser.runtime.id) 
        {
            console.log(`Ids do not match.`);
            return;
        }
        
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
                        response = await app.syncVaults(await getMasterKey(), app.userInfo!.email!);
                        break;
                        
                    case RuntimeMessages.IsSignedIn:
                        response = app.loadedUser.value;
                        break;
                        
                    case RuntimeMessages.SignIn:
                        response = await signUserIn(message.email, message.masterKey, message.mfaCode);
                        break;

                    case RuntimeMessages.GetVaultAndUserData:
                        response = 
                        {
                            vaultData: app.currentVault.toCondensedVaultData(),
                            userPreferences: JSON.stringify(app.userPreferences.getState()),
                        };

                        if (sessionInterval)
                        {
                            clearInterval(sessionInterval);
                        }

                        const autolockTime = app.calcAutolockTime(app.getState().s.a);
                        const sessionIntervalTime = Math.min(1000 * 60 * 10, autolockTime - (1000 * 30));

                        sessionInterval = setInterval(() =>
                        {
                            if (app.loadedUser.value)
                            {
                                app.resetSessionTime();
                            }
                        }, sessionIntervalTime);
                        break;

                    case RuntimeMessages.GetDataBreaches:
                        response = 
                        {
                            failedToLoadDataBreaches: app.vaultDataBreaches.failedToLoadDataBreaches,
                            loadedDataBreaches: app.vaultDataBreaches.loadedDataBreaches || !app.canShowSubscriptionWidgets.value,
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
                        response = await app.setActiveVault(await getMasterKey(), message.userVaultID);
                        break;

                    case RuntimeMessages.GetPasswordsByDomain:
                        response = [];
                        if (app.currentVault?.passwordsByDomain !== undefined)
                        {
                            OH.forEachKey(app.currentVault.passwordsByDomain, (domain: string) => 
                            {
                                if (domain.includes(message.domain) || message.domain.includes(domain))
                                {
                                    OH.forEachKey(app.currentVault.passwordsByDomain![domain], (password: string) => 
                                    {                     
                                        if (!app.currentVault.passwordStore.passwordsByID[password].l)
                                        {
                                            return;
                                        }
                                        
                                        const tempPassword: { username?: string, id?: string, passwordFor?: string } = 
                                        {
                                            id: password,
                                            username: app.currentVault.passwordStore.passwordsByID[password].l,
                                            passwordFor: app.currentVault.passwordStore.passwordsByID[password].f || domain
                                        };

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
                        const addPasswordPendingStoreState = app.currentVault.passwordStore.reconstructPendingStoreState(message.pendingPasswordStoreState)!;
                        response = await app.currentVault.passwordStore.addPassword(await getMasterKey(), message.password, message.addedSecurityQuestions, addPasswordPendingStoreState);
                        break;
                    
                    case RuntimeMessages.UpdatePassword:
                        const updatePasswordPendingStoreState = app.currentVault.passwordStore.reconstructPendingStoreState(message.pendingPasswordState)!;
                        response = await app.currentVault.passwordStore.updatePassword(await getMasterKey(), message.updatingPassword, message.passwordWasUpdated, message.addedSecurityQuestions, message.updatedSecurityQuestionQuestions, message.updatedSecurityQuestionAnswers, message.deletedSecurityQuestions, message.addingGroups, updatePasswordPendingStoreState);
                        break;
                    
                    case RuntimeMessages.DeletePassword:
                        response = await app.currentVault.passwordStore.deletePassword(await getMasterKey(), message.password);
                        break;

                    case RuntimeMessages.AddValue:
                        const addValuePendingStoreState = app.currentVault.valueStore.reconstructPendingStoreState(message.pendingValueStoreState)!;
                        response = await app.currentVault.valueStore.addNameValuePair(await getMasterKey(), message.value, addValuePendingStoreState);
                        break;
                    
                    case RuntimeMessages.UpdateValue:
                        const updateValuePendingStoreState = app.currentVault.valueStore.reconstructPendingStoreState(message.pendingValueStoreState)!;
                        response = await app.currentVault.valueStore.updateNameValuePair(await getMasterKey(), message.updatedValue, message.valueWasUpdated, message.groups, updateValuePendingStoreState);
                        break;

                    case RuntimeMessages.DeleteValue:
                        response = await app.currentVault.valueStore.deleteNameValuePair(await getMasterKey(), message.value);
                        break;
                    
                    case RuntimeMessages.AddFilter:
                        const addFilterPendingStoreState = app.currentVault.filterStore.reconstructPendingStoreState(message.pendingFilterState)!;
                        response = await app.currentVault.filterStore.addFilter(await getMasterKey(), message.filter, addFilterPendingStoreState);
                        break;

                    case RuntimeMessages.UpdateFilter:
                        const updateFilterPendingStoreState = app.currentVault.filterStore.reconstructPendingStoreState(message.pendingFilterState)!;
                        response = await app.currentVault.filterStore.updateFilter(await getMasterKey(), message.updatedFilter, message.addedConditions, message.removedConditions, updateFilterPendingStoreState);
                        break;
                    
                    case RuntimeMessages.DeleteFilter:
                        response = await app.currentVault.filterStore.deleteFilter(await getMasterKey(), message.filter);
                        break;

                    case RuntimeMessages.AddGroup:
                        const addGroupPendingStoreState = app.currentVault.groupStore.reconstructPendingStoreState(message.pendingStoreState)!;
                        response = await app.currentVault.groupStore.addGroup(await getMasterKey(), message.group, addGroupPendingStoreState);
                        break;
                    
                    case RuntimeMessages.UpdateGroup:
                        const updateGroupPendingStoreState = app.currentVault.groupStore.reconstructPendingStoreState(message.pendingGroupStoreState)!;
                        response = await app.currentVault.groupStore.updateGroup(await getMasterKey(), message.updatedGroup, message.updatePrimaryObjects, updateGroupPendingStoreState);
                        break;

                    case RuntimeMessages.DeleteGroup:
                        response = await app.currentVault.groupStore.deleteGroup(await getMasterKey(), message.group);
                        break;
                    
                    case RuntimeMessages.ToggleFilter:
                        await app.userPreferences.toggleFilter(message.id);
                        response = true;
                        break;

                    case RuntimeMessages.DismissVaultDataBreach:
                        response = await app.vaultDataBreaches.dismissVaultDataBreach(message.vaultDataBreachID);
                        break;

                    case RuntimeMessages.GeneratePassword:
                        // Generate a random password with default parameters
                        // RandomValueType.Password, length 16, include numbers, include special chars, exclude ambiguous chars
                        response = generatorUtility.generateRandomPasswordOrPassphrase(
                            RandomValueType.Password,
                            message.length || 16,
                            message.includeNumbers !== undefined ? message.includeNumbers : true,
                            message.includeSpecialCharacters !== undefined ? message.includeSpecialCharacters : true,
                            message.includeAmbiguousCharacters !== undefined ? message.includeAmbiguousCharacters : false,
                            ''
                        );
                        break;

                    case RuntimeMessages.SetTemporaryPassword:
                        temporaryPassword = { domain: message.domain, password: message.password };
                        break;
                    
                    case RuntimeMessages.GetTemporaryPassword:
                        response = temporaryPassword;
                        break;

                    case RuntimeMessages.ClearTemporaryPassword:
                        temporaryPassword = undefined;
                        break;

                    case RuntimeMessages.SaveTemporaryPassword:
                        if (temporaryPassword && temporaryPassword.password)
                        {
                            const password: Password = defaultPassword();
                            password.p = temporaryPassword.password;
                            password.f = temporaryPassword.domain;
                            password.d = temporaryPassword.domain;

                            const pendingPasswordStoreState = app.currentVault.passwordStore.getPendingState()!;
                            response = await app.currentVault.passwordStore.addPassword(await getMasterKey(), password, [], pendingPasswordStoreState);

                            if (response)
                            {
                                temporaryPassword = undefined;
                            }
                        }
                        break;
                    
                    case RuntimeMessages.GetValidMasterKey:
                        response = await getMasterKey();
                        break;

                    case RuntimeMessages.SymmetricDecrypt:
                        response = await environment.utilities.crypt.symmetricDecrypt(message.masterKey, message.encryptedValue);
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

async function getMasterKey(): Promise<string>
{
    return (await api.repositories.users.getValidMasterKey())!;
}

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