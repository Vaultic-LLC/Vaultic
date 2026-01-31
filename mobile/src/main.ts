import { createApp } from 'vue'
import './style.css'
import App from './Core/Renderer/App.vue'
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ConfirmationService from 'primevue/confirmationservice';

import { coreAPIResolver } from "./Core/Main/CoreAPIResolver";
import * as rendererAPI from './Core/Renderer/API';
import { DeviceInfo } from '@vaultic/shared/Types/Device';
import { CVaulticHelper } from './Lib/Helpers/VaulticHelper';
import { generatorUtility, PromisifyGeneratorUtility } from './Lib/Utilities/GeneratorUtility';
import { environment } from './Core/Main/Environment';
import { DataUtility } from './Lib/Utilities/DataUtility';
import { HashUtility } from './Lib/Utilities/HashUtility';
import { CryptUtility } from './Lib/Utilities/CryptUtility';
import { createDataSource, deleteDatabase } from './Lib/Helpers/DatabaseHelper';
import app from './Core/Renderer/Objects/Stores/AppStore';
import { postHookHandler } from './Lib/Helpers/PostHookHander';
import { MobileAuthHelper } from './Lib/Helpers/MobileAuthHelper';

const apiResolver = coreAPIResolver.toPlatformDependentAPIResolver(
    () => Promise.resolve({} as DeviceInfo), 
    new CVaulticHelper(), 
    new PromisifyGeneratorUtility(),
    new MobileAuthHelper());

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
    postHooks: postHookHandler,
    getDeviceInfo: () => ({
        deviceName: "VaulticMobile",
        model: "Vaultic",
        version: "1.0.0",
        platform: "extension",
        mac: "00:00:00:00:00:00"
    } as DeviceInfo),
    hasConnection: () => Promise.resolve(true)
}).then(() => 
{
    app.isMobile = true;
    app.userPreferences.loadLastUsersPreferences().then(() =>
    {
        const appUI = createApp(App);
        appUI.use(PrimeVue, {
            theme: {
                preset: Aura,
                options: {
                    darkModeSelector: '.darkMode',
                }
            }
        });
        
        appUI.use(ConfirmationService);
        appUI.mount('#app');
    });  
});
