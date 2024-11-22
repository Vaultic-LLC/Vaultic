import { IIdentifiable } from "./Fields";

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

export interface ClientDevice extends IIdentifiable, Device
{
    Type: DeviceType;
}

export interface DeviceInfo
{
    deviceName: string;
    model: string;
    version: string;
    platform: string;
    mac: string;
}
