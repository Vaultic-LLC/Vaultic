import { electronAPI } from '@electron-toolkit/preload'
import fs from "fs";
import child_process from 'child_process';
import vaulticServer from '../Server/VaulticServer';
import { MethodResponse } from '../../Types/MethodResponse';

export interface File
{
	exists: () => Promise<boolean>;
	empty: () => Promise<void>;
	write: (data: string) => Promise<MethodResponse>;
	read: () => Promise<MethodResponse>;
}

let directory = electronAPI.process.env.APPDATA || (electronAPI.process.platform == 'darwin' ? electronAPI.process.env.HOME + '/Library/Preferences' : electronAPI.process.env.HOME + "/.local/share");
directory += "\\Vaultic\\DataStores";

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
		return new Promise<string>((resolve) =>
		{
			fs.readFile(fullPath, { encoding: 'utf8' }, (err, data) =>
			{
				if (err != null)
				{
					resolve("");
				}

				resolve(data);
			});
		});
	}

	function writeFile(data: string): Promise<void>
	{
		return new Promise<void>((resolve) =>
		{
			fs.writeFile(fullPath, data, { encoding: 'utf8' }, (err) =>
			{
				if (err != null)
				{
					// TODO: Log error
				}

				resolve();
			});
		});
	}

	function exists(): Promise<boolean>
	{
		return fileExistsAndHasData();
	}

	async function empty(): Promise<void>
	{
		let unlocked: boolean = false;
		try
		{
			await unlock();
			unlocked = true;

			await writeFile("");
			await lock();

			unlocked = false;
		}
		catch (e: any)
		{
			if (e?.error instanceof Error)
			{
				const error: Error = e?.error as Error;
				await vaulticServer.app.log(error.message, error.stack ?? "");
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

			await writeFile(data);
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
				const response = await vaulticServer.app.log(error.message, error.stack ?? "");
				if (response.success)
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
				const response = await vaulticServer.app.log(error.message, error.stack ?? "");
				if (response.success)
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
		empty,
		read,
		write
	}
}
