import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { environment } from '../../lib/Main/Environment';
import { coreAPIResolver } from '../../lib/Main/CoreAPIResolver';
import * as rendererAPI from '../../lib/Renderer/API';
import { CryptUtility } from '../../lib/Utilities/CryptUtility';
import { HashUtility } from '@/lib/Utilities/HashUtility';
import { DataUtility } from '@/lib/Utilities/DataUtility';
import { DeviceInfo } from '@vaultic/shared/Types/Device';
import { CVaulticHelper } from '@/lib/Helpers/VaulticHelper';
import { createDataSource, deleteDatabase } from '@/lib/Helpers/DatabaseHelper';
import { generatorUtility, PromisifyGeneratorUtility } from '@/lib/Utilities/GeneratorUtility';

let currentSession: string = "";
async function setSession(tokenHash: string): Promise<void>
{
    currentSession = tokenHash;
}

async function getSession(): Promise<string>
{
    return currentSession;
}

console.log("initializing environment");
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

console.log("setting api resolver");
const apiResolver = coreAPIResolver.toPlatformDependentAPIResolver(() => Promise.resolve({} as DeviceInfo), new CVaulticHelper(), new PromisifyGeneratorUtility());
console.log("api resolver", apiResolver);
rendererAPI.api.setAPIResolver(apiResolver);
createApp(App).mount('#app');