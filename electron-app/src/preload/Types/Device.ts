export interface Device
{
	UserDesktopDeviceID: number;
	UserMobileDeviceID: number;
	Name: string;
	Model: string;
	Version: string;
	MacAddress: string;
	Type: string;
}

export interface DeviceInfo
{
	deviceName: string;
	platform: string;
	mac: string;
}
