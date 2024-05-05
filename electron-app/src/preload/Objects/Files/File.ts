import { electronAPI } from '@electron-toolkit/preload'
import fs from "fs";
import child_process from 'child_process';
import vaulticServer from '../Server/VaulticServer';
import { MethodResponse } from '../../Types/MethodResponse';

export interface File
{
	exists: () => Promise<boolean>;
	write: (data: string) => Promise<MethodResponse>;
	read: () => Promise<MethodResponse>;
}

let directory = electronAPI.process.env.APPDATA || (electronAPI.process.platform == 'darwin' ? electronAPI.process.env.HOME + '/Library/Preferences' : electronAPI.process.env.HOME + "/.local/share");
directory += "\\Vaultic\\DataStores";

export function writeFile(fullPath: string, data: string): Promise<void>
{
	return new Promise<void>((resolve, reject) =>
	{
		fs.writeFile(fullPath, data, { encoding: 'utf8' }, (err) =>
		{
			if (err != null)
			{
				reject(err);
			}

			resolve();
		});
	});
}

export default function useFile(name: string): File
{
	const fileName = `${name}.json`;
	const fullPath = directory + "\\" + fileName;

	function checkMakeDataDirectory(): void
	{
		if (!fs.existsSync(directory))
		{
			try
			{
				fs.mkdirSync(directory);
			}
			catch { }
		}
	}

	async function fileExistsAndHasData(): Promise<boolean>
	{
		await unlock();

		if (!fs.existsSync(fullPath))
		{
			return false;
		}

		const size = fs.statSync(fullPath).size;

		await lock();
		return size > 0;
	}

	// TODO: These won't work on Mac
	function unlock(): Promise<void>
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

	function lock(): Promise<void>
	{
		return new Promise<void>((resolve) =>
		{
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

	function readFile(): Promise<string>
	{
		return new Promise<string>((resolve, reject) =>
		{
			fs.readFile(fullPath, { encoding: 'utf8' }, (err, data) =>
			{
				if (err != null)
				{
					reject(err);
				}

				resolve(data);
			});
		});
	}

	function exists(): Promise<boolean>
	{
		return fileExistsAndHasData();
	}

	async function write(data: string): Promise<MethodResponse>
	{
		let unlocked: boolean = false;
		let wrote: boolean = false;
		let logID: number | undefined;

		try
		{
			await unlock();
			unlocked = true;

			await writeFile(fullPath, data);
			wrote = true;

			await lock();
			unlocked = false;

			return { success: true }
		}
		catch (e: any)
		{
			if (e?.error instanceof Error)
			{
				const error: Error = e?.error as Error;
				const response = await vaulticServer.app.log(error.message, "File.Write");
				if (response.Success)
				{
					logID = response.LogID;
				}
			}
		}

		if (unlocked)
		{
			try
			{
				await lock();
			}
			catch { }
		}

		return { success: wrote, logID: logID }
	}

	async function read(): Promise<MethodResponse>
	{
		if (!await fileExistsAndHasData())
		{
			return { success: true, value: "" };
		}

		let unlocked: boolean = false;
		let data: string = "";
		let logID: number | undefined;
		try
		{
			await unlock();
			unlocked = true;

			data = await readFile();

			await lock();
			unlocked = false;

			return { success: true, value: data };
		}
		catch (e: any)
		{
			if (e?.error instanceof Error)
			{
				const error: Error = e?.error as Error;
				const response = await vaulticServer.app.log(error.message, "File.Read");
				if (response.Success)
				{
					logID = response.LogID;
				}
			}
		}

		if (unlocked)
		{
			try
			{
				await lock();
			}
			catch { }
		}

		return { success: data != "", value: data, logID: logID };
	}

	checkMakeDataDirectory();

	return {
		exists,
		read,
		write
	}
}
