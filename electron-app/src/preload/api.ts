import { electronAPI } from '@electron-toolkit/preload'
import child_process from 'child_process';
import fs from "fs"
import os from "os"

export interface API
{
	platform: string;
	dataDirectory: string;
	readFile: (file: string) => string;
	writeFile: (data: string, file: string) => void;
	fileExistsAndHasData: (file: string) => boolean;
	checkMakeDataDirectory: () => void;
	lockFile: (file: string) => void;
	unlockFile: (file: string) => void;
}

let dataDirectory: string = electronAPI.process.env.APPDATA || (electronAPI.process.platform == 'darwin' ? electronAPI.process.env.HOME + '/Library/Preferences' : electronAPI.process.env.HOME + "/.local/share");
dataDirectory += "\\FuzzysStore";

function readFile(file: string): string
{
	// return new Promise<string>((resolve, reject) =>
	// {
	// 	fs.readFile(dataDirectory + "\\" + file, { encoding: 'utf8' }, (err, data) =>
	// 	{
	// 		if (err != null)
	// 		{
	// 			reject(err);
	// 		}

	// 		resolve(data);
	// 	});
	// })

	return fs.readFileSync(dataDirectory + "\\" + file, { encoding: 'utf8' });
}

function writeFile(data: string, file: string): void
{
	fs.writeFileSync(dataDirectory + "\\" + file, data, { encoding: 'utf8' });
}

function checkMakeDataDirectory(): void
{
	if (!fs.existsSync(dataDirectory))
	{
		fs.mkdirSync(dataDirectory);
	}
}

function fileExistsAndHasData(file: string): boolean
{
	unlockFile(file);

	const filePath: string = dataDirectory + "\\" + file;
	if (!fs.existsSync(filePath))
	{
		return false;
	}

	const size = fs.statSync(filePath).size;

	lockFile(file);
	return size > 0;
}

function unlockFile(file: string): void
{
	child_process.spawnSync("icacls", [file, "/remove:d", "everyone"], {
		shell: true, stdio: [
			'pipe', // stdin: changed from the default `pipe`
			'inherit', // stdout
			'inherit' // stderr: changed from the default `pipe`
		],
		cwd: dataDirectory
	});
}

function lockFile(file: string): void
{
	child_process.spawnSync("icacls", [file, "/deny", "everyone:f"], {
		shell: true, stdio: [
			'pipe', // stdin: changed from the default `pipe`
			'inherit', // stdout
			'inherit' // stderr: changed from the default `pipe`
		],
		cwd: dataDirectory
	});
}

const api: API = {
	platform: os.platform(),
	dataDirectory,
	unlockFile,
	lockFile,
	checkMakeDataDirectory,
	fileExistsAndHasData,
	readFile,
	writeFile
}

export default api;
