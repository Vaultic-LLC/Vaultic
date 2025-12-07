import { DisplayVault } from "@vaultic/shared/Types/Entities";
import { RuntimeMessages } from "../Types/RuntimeMessages";
import syncManager from "./SyncManager";

class VaultManager
{
    private internalCurrentVault: Ref<DisplayVault | undefined>;
    get currentVault() { return this.internalCurrentVault.value; }

    constructor() 
    {
        this.internalCurrentVault = ref(undefined);
    }

    async init()
    {
        this.internalCurrentVault.value = await browser.runtime.sendMessage({ type: RuntimeMessages.GetCurrentVault });
    }

    async loadVault(userVaultID: number): Promise<boolean>
    {
        const success: boolean = await browser.runtime.sendMessage({ type: RuntimeMessages.LoadVault, userVaultID });
        if (!success)
        {
            return false;
        }

        this.internalCurrentVault.value = await browser.runtime.sendMessage({ type: RuntimeMessages.GetVaultByUserVaultID, userVaultID });
        await syncManager.syncData();

        return true;
    }
}

const vaultManager = new VaultManager();
export default vaultManager;