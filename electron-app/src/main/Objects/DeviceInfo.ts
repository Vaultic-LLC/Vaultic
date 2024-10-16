import os from "os";
import getMAC from 'getmac'
import child from "child_process"
import { DeviceInfo } from "@vaultic/shared/Types/Device";

const platform = os.platform();

function getComputerName()
{
	switch (platform)
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

function getOS()
{
	switch (platform)
	{
		case "win32":
			return 'Windows';
		case "darwin":
			return "Mac";
		case "linux":
			return "Linux";
	}

	return "";
}

const deviceName = getComputerName() ?? "";
const model = getOS();
const version = os.release();
//@ts-ignore
const mac = getMAC.default();

export function getDeviceInfo(): DeviceInfo
{
	return {
		deviceName,
		model,
		version,
		platform,
		mac
	}
}
