class SyncManager
{
    private afterSyncCallbacks: (() => void)[] = [];
    constructor() {}

    addAfterSyncCallback(position: number,callback: () => Promise<void>)
    {
        this.afterSyncCallbacks[position] = callback;
    }

    syncData()
    {
        for (const callback of this.afterSyncCallbacks)
        {
            callback?.();
        }
    }
}

const syncManager = new SyncManager();
export default syncManager;