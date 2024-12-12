import { Field, IIdentifiable } from "./Fields";

export interface Device
{
    [key: string]: any;
    UserDesktopDeviceID?: number;
    UserMobileDeviceID?: number;
    Name: string;
    Model: string;
    Version: string;
}

type DeviceType = "Desktop" | "Mobile";

export interface ClientDevice extends IIdentifiable
{
    userDesktopDeviceID: Field<number | undefined>;
    userMobileDeviceID: Field<number | undefined>;
    name: Field<string>;
    model: Field<string>;
    version: Field<string>;
    type: Field<DeviceType>;
}

export interface DeviceInfo
{
    deviceName: string;
    model: string;
    version: string;
    platform: string;
    mac: string;
}
