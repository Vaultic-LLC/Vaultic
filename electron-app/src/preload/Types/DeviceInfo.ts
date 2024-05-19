import child from "child_process"
import { DeviceInfo } from "../Types/Device";
import { ipcRenderer } from "electron";

let platfrom = "";
let osHostName = "";
let model = "";
let deviceName = "";
let version = "";
let macAddress = "";

function getComputerName(): string
{
	switch (platfrom)
	{
		case "win32":
			return process.env.COMPUTERNAME ?? "";
		case "darwin":
			return child.execSync("scutil --get ComputerName").toString().trim();
		case "linux":
			const prettyname = child.execSync("hostnamectl --pretty").toString().trim();
			return prettyname === "" ? osHostName : prettyname;
		default:
			return osHostName;
	}
}

function getOS()
{
	switch (platfrom)
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

function setupDeviceInfo()
{
	ipcRenderer.invoke('os:platform').then((platform: string) =>
	{
		platfrom = platform;
		model = getOS();

		ipcRenderer.invoke('os:hostname').then((hostname: string) =>
		{
			osHostName = hostname;
			deviceName = getComputerName();
		});

		ipcRenderer.invoke('os:release').then((release: string) =>
		{
			version = release;
		});
	});

	ipcRenderer.invoke('device:getMac').then((mac: string) =>
	{
		macAddress = mac;
	});
}

setupDeviceInfo();

export function getDeviceInfo(): DeviceInfo
{
	return {
		get deviceName() { return deviceName; },
		get model() { return model; },
		get version() { return version; },
		get platform() { return platfrom; },
		get mac() { return macAddress; }
	}
}
