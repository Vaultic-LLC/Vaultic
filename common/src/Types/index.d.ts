export function setupApp(): void;
export const vaulticAPI: {
    readonly server: import("./Types/APITypes").VaulticServer;
    readonly utilities: import("./Types/APITypes").Utilities;
    readonly helpers: import("./Types/APITypes").Helpers;
    readonly files: import("./Types/APITypes").Files;
    internalAPI: import("./Types/APITypes").IAPI | undefined;
    setAPI(api: import("./Types/APITypes").IAPI): void;
    getDeviceInfo(): Promise<import("./Types/APITypes").DeviceInfo>;
};
