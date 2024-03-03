import os from "os";
import getMAC from 'getmac'
import child from "child_process"
import { DeviceInfo } from "../Types/Device";

function getComputerName()
{
	switch (process.platform)
	{
		case "win32":
			return process.env.COMPUTERNAME;
		case "darwin":
			return child.execSync("scutil --get ComputerName").toString().trim();
		case "linux":
			const prettyname = child.execSync("hostnamectl --pretty").toString().trim();
			return prettyname === "" ? os.hostname() : prettyname;
		default:
			return os.hostname();
	}
}

const deviceName = getComputerName() ?? "";

export function getDeviceInfo(): DeviceInfo
{
	return {
		deviceName,
		platform: os.platform(),
		//@ts-ignore
		mac: getMAC.default()
	}
}
