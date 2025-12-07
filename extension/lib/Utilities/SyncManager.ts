class SyncManager
{
    private afterSyncCallbacks: (() => Promise<void>)[] = [];
    constructor() {}

    addAfterSyncCallback(position: number,callback: () => Promise<void>)
    {
        this.afterSyncCallbacks[position] = callback;
    }

    async syncData()
    {
        for (const callback of this.afterSyncCallbacks)
        {
            await callback?.();
        }
    }
}

const syncManager = new SyncManager();
export default syncManager;