import useFile, { File } from "./File";

export interface Files
{
	app: File;
	settings: File;
	password: File;
	value: File;
	filter: File;
	group: File;
	license: File;
}

const appFile = useFile("app");
const settingsFile = useFile("settings");
const passwordFile = useFile("passwords");
const valueFile = useFile("values");
const filterFile = useFile("filters");
const groupFile = useFile("groups");
const licenseFile = useFile("license");

const files: Files =
{
	app: appFile,
	settings: settingsFile,
	password: passwordFile,
	value: valueFile,
	filter: filterFile,
	group: groupFile,
	license: licenseFile
}

export default files;
