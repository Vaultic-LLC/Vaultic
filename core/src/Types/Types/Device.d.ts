export interface Device {
    id: string;
    UserDesktopDeviceID?: number;
    UserMobileDeviceID?: number;
    Name: string;
    Model: string;
    Version: string;
    Type: string;
}
export interface DeviceInfo {
    deviceName: string;
    model: string;
    version: string;
    platform: string;
    mac: string;
}
