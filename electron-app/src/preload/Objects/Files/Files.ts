import useFile, { File } from "./File";

export interface Files
{
	app: File;
	settings: File;
	encryptedData: File;
	filter: File;
	group: File;
	license: File;
}

const appFile = useFile("app");
const settingsFile = useFile("settings");
const encryptedDataFile = useFile("data");
const filterFile = useFile("filters");
const groupFile = useFile("groups");
const licenseFile = useFile("license");

const files: Files =
{
	app: appFile,
	settings: settingsFile,
	encryptedData: encryptedDataFile,
	filter: filterFile,
	group: groupFile,
	license: licenseFile
}

export default files;
