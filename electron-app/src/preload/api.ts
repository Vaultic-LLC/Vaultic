import { electronAPI } from '@electron-toolkit/preload'
import child_process from 'child_process';
import fs from "fs"
import os from "os"

export interface API
{
	platform: string;
	dataDirectory: string;
	readFile: (file: string) => Promise<string>;
	writeFile: (data: string, file: string) => Promise<void>;
	fileExistsAndHasData: (file: string) => Promise<boolean>;
	checkMakeDataDirectory: () => void;
	lockFile: (file: string) => Promise<void>;
	unlockFile: (file: string) => Promise<void>;
}

let dataDirectory: string = electronAPI.process.env.APPDATA || (electronAPI.process.platform == 'darwin' ? electronAPI.process.env.HOME + '/Library/Preferences' : electronAPI.process.env.HOME + "/.local/share");
dataDirectory += "\\FuzzysStore";

function readFile(file: string): Promise<string>
{
	return new Promise<string>((resolve, reject) =>
	{
		fs.readFile(dataDirectory + "\\" + file, { encoding: 'utf8' }, (err, data) =>
		{
			if (err != null)
			{
				resolve("");
			}

			resolve(data);
		});
	})

	//return fs.readFileSync(dataDirectory + "\\" + file, { encoding: 'utf8' });
}

function writeFile(data: string, file: string): Promise<void>
{
	return new Promise<void>((resolve, _) =>
	{
		fs.writeFile(dataDirectory + "\\" + file, data, { encoding: 'utf8' }, (err) =>
		{
			if (err != null)
			{
				// TODO: Log error
			}

			resolve();
		});
	})
	//fs.writeFileSync(dataDirectory + "\\" + file, data, { encoding: 'utf8' });
}

function checkMakeDataDirectory(): void
{
	if (!fs.existsSync(dataDirectory))
	{
		fs.mkdirSync(dataDirectory);
	}
}

async function fileExistsAndHasData(file: string): Promise<boolean>
{
	await unlockFile(file);

	const filePath: string = dataDirectory + "\\" + file;
	if (!fs.existsSync(filePath))
	{
		return false;
	}

	const size = fs.statSync(filePath).size;

	await lockFile(file);
	return size > 0;
}

function unlockFile(file: string): Promise<void>
{
	// child_process.spawnSync("icacls", [file, "/remove:d", "everyone"], {
	// 	shell: true, stdio: [
	// 		'pipe', // stdin: changed from the default `pipe`
	// 		'inherit', // stdout
	// 		'inherit' // stderr: changed from the default `pipe`
	// 	],
	// 	cwd: dataDirectory
	// });
	return new Promise<void>((resolve, reject) =>
	{
		const child = child_process.spawn("icacls", [file, "/remove:d", "everyone"], {
			shell: true, stdio: [
				'pipe', // stdin: changed from the default `pipe`
				'inherit', // stdout
				'inherit' // stderr: changed from the default `pipe`
			],
			cwd: dataDirectory
		});

		child.on('exit', () =>
		{
			resolve();
		});
	});
}

function lockFile(file: string): Promise<void>
{
	// child_process.spawnSync("icacls", [file, "/deny", "everyone:f"], {
	// 	shell: true, stdio: [
	// 		'pipe', // stdin: changed from the default `pipe`
	// 		'inherit', // stdout
	// 		'inherit' // stderr: changed from the default `pipe`
	// 	],
	// 	cwd: dataDirectory
	// });

	return new Promise<void>((resolve, reject) =>
	{
		const child = child_process.spawn("icacls", [file, "/deny", "everyone:f"], {
			shell: true, stdio: [
				'pipe', // stdin: changed from the default `pipe`
				'inherit', // stdout
				'inherit' // stderr: changed from the default `pipe`
			],
			cwd: dataDirectory
		});

		child.on('exit', () =>
		{
			resolve();
		});
	})
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
