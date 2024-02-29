import os from "os";
import getMAC from 'getmac'

export interface DeviceInfo
{
	platform: string;
	mac: string;
}

export function getDeviceInfo(): DeviceInfo
{
	return {
		platform: os.platform(),
		//@ts-ignore
		mac: getMAC.default()
	}
}
