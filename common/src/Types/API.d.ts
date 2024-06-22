import { IAPI } from "./Types/APITypes";
declare class API {
    get server(): import("./Types/APITypes").VaulticServer;
    get utilities(): import("./Types/APITypes").Utilities;
    get helpers(): import("./Types/APITypes").Helpers;
    get files(): import("./Types/APITypes").Files;
    private internalAPI;
    constructor();
    setAPI(api: IAPI): void;
    getDeviceInfo(): Promise<import("./Types/APITypes").DeviceInfo>;
}
export declare const api: API;
export {};
