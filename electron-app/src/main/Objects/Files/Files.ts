import { Files } from "../../Core/Types/File";
import useFile from "./File";

let appFile;
let settingsFile;
let passwordFile;
let valueFile;
let filterFile;
let groupFile;
let userPreferencesFile;

export function initFiles()
{
	appFile = useFile("app");
	settingsFile = useFile("settings");
	passwordFile = useFile("passwords");
	valueFile = useFile("values");
	filterFile = useFile("filters");
	groupFile = useFile("groups");
	userPreferencesFile = useFile("userPreferences");
}

export default function getVaulticFiles(): Files
{
	return {
		app: appFile,
		settings: settingsFile,
		password: passwordFile,
		value: valueFile,
		filter: filterFile,
		group: groupFile,
		userPreferences: userPreferencesFile
	}
}
