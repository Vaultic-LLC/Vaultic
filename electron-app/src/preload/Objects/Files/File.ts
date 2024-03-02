import { electronAPI } from '@electron-toolkit/preload'
import fs from "fs";
import child_process from 'child_process';
import currentLicense from '../License';

export interface File
{
	exists: () => Promise<boolean>;
	empty: () => Promise<void>;
	write: (data: string) => Promise<void>;
	read: () => Promise<string>;
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
		if (!currentLicense.isValid())
		{
			return;
		}

		let unlocked: boolean = false;
		try
		{
			await unlock();
			unlocked = true;

			await writeFile("");
			await lock();

			unlocked = false;
		}
		catch (e)
		{
			console.log(e);
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

	async function write(data: string): Promise<void>
	{
		if (!currentLicense.isValid())
		{
			return;
		}

		let unlocked: boolean = false;
		try
		{
			await unlock();
			unlocked = true;

			await writeFile(data);

			await lock();
			unlocked = false;
		}
		catch (e)
		{
			console.log(e);
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

	async function read(): Promise<string>
	{
		if (!currentLicense.isValid())
		{
			return "";
		}

		if (!await fileExistsAndHasData())
		{
			return "";
		}

		let unlocked: boolean = false;
		try
		{
			await unlock();
			unlocked = true;

			const data: string = await readFile();

			await lock();
			unlocked = false;

			return data;
		}
		catch (e)
		{
			console.log(e);
		}

		if (unlocked)
		{
			try
			{
				await lock();
			}
			catch { }
		}

		return "";
	}

	checkMakeDataDirectory();

	return {
		exists,
		empty,
		read,
		write
	}
}
