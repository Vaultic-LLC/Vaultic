class SyncManager
{
    private afterSyncCallbacks: (() => void)[] = [];
    constructor() {}

    addAfterSyncCallback(callback: () => Promise<void>)
    {
        this.afterSyncCallbacks.push(callback);
    }

    syncData()
    {
        // TODO: sync data

        for (const callback of this.afterSyncCallbacks)
        {
            callback();
        }
    }
}

const syncManager = new SyncManager();
export default syncManager;