import child_process from 'child_process';
import os from "os";
import { env } from 'process';

export interface FileLocker
{
	lock: (fileName: string, directory: string) => Promise<void>;
	unlock: (fileName: string, directory: string) => Promise<void>;
}

function windowsLock(fileName: string, directory: string): Promise<void>
{
	return new Promise<void>((resolve) =>
	{
		console.log(`Path is ${env.PATH}`);

		const child = child_process.spawn("icacls", [fileName, "/deny", "everyone:f"], {
			shell: true, windowsHide: true, stdio: [
				'pipe', // stdin: changed from the default `pipe`
				'inherit', // stdout
				'inherit' // stderr: changed from the default `pipe`
			],
			cwd: directory
		});

		child.on('exit', () =>
		{
			resolve();
		});
	});
}

function windowsUnlock(fileName: string, directory: string): Promise<void>
{
	return new Promise<void>((resolve) =>
	{
		const child = child_process.spawn("icacls", [fileName, "/remove:d", "everyone"], {
			shell: true, windowsHide: true, stdio: [
				'pipe', // stdin: changed from the default `pipe`
				'inherit', // stdout
				'inherit' // stderr: changed from the default `pipe`
			],
			cwd: directory
		});

		child.on('exit', () =>
		{
			resolve();
		});
	});
}

function unixLock(fileName: string, directory: string): Promise<void>
{
	return new Promise<void>((resolve) =>
	{
		const child = child_process.spawn("chmod", ["o-rw", fileName], {
			shell: true, windowsHide: true, stdio: [
				'pipe', // stdin: changed from the default `pipe`
				'inherit', // stdout
				'inherit' // stderr: changed from the default `pipe`
			],
			cwd: directory
		});

		child.on('exit', () =>
		{
			resolve();
		});
	});
}

function unixUnlock(fileName: string, directory: string): Promise<void>
{
	return new Promise<void>((resolve) =>
	{
		const child = child_process.spawn("chmod", ["o+rw", fileName], {
			shell: true, windowsHide: true, stdio: [
				'pipe', // stdin: changed from the default `pipe`
				'inherit', // stdout
				'inherit' // stderr: changed from the default `pipe`
			],
			cwd: directory
		});

		child.on('exit', () =>
		{
			resolve();
		});
	});
}

const unknownOSLocker: FileLocker =
{
	lock: () => { return Promise.resolve(); },
	unlock: () => { return Promise.resolve(); }
}

const windowsLocker: FileLocker =
{
	lock: windowsLock,
	unlock: windowsUnlock
};

const unixLocker: FileLocker =
{
	lock: unixLock,
	unlock: unixUnlock
}

export function getFileLocker(): FileLocker
{
	const platform = os.platform();
	if (platform === "win32")
	{
		return windowsLocker;
	}
	else if (platform === "darwin")
	{
		return unixLocker;
	}

	return unknownOSLocker;
}
