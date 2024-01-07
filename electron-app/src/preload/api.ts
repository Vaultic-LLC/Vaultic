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
	checkMakeDataDirectory: () => void;
	lockFile: (file: string) => Promise<void>;
	unlockFile: (file: string) => Promise<void>;
}

let dataDirectory: string = electronAPI.process.env.APPDATA || (electronAPI.process.platform == 'darwin' ? electronAPI.process.env.HOME + '/Library/Preferences' : electronAPI.process.env.HOME + "/.local/share");
dataDirectory += "\\FuzzysStore";

function readFile(file: string): string
{
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

const unlockFile = async (file: string): Promise<void> =>
{
	console.log('start unlock');
	await new Promise<void>((resolve, reject) =>
	{
		const t = child_process.spawn("icacls", [file, "/remove:d", "everyone"], {
			shell: true, stdio: [
				'pipe', // stdin: changed from the default `pipe`
				'inherit', // stdout
				'inherit' // stderr: changed from the default `pipe`
			],
			cwd: dataDirectory
		});
	});

	console.log('finish unlock');
}

const lockFile = async (file: string): Promise<void> =>
{
	await new Promise<void>((resolve, reject) =>
	{
		const t = child_process.spawn("icacls", [file, "/deny", "everyone:f"], {
			shell: true, stdio: [
				'pipe', // stdin: changed from the default `pipe`
				'inherit', // stdout
				'inherit' // stderr: changed from the default `pipe`
			],
			cwd: dataDirectory
		});
	});
}

const api: API = {
	platform: os.platform(),
	dataDirectory,
	unlockFile,
	lockFile,
	checkMakeDataDirectory,
	readFile,
	writeFile
}

export default api;
