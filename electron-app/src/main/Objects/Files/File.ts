import { electronAPI } from '@electron-toolkit/preload'
import fs from "fs";
import { MethodResponse } from '../../Core/Types/MethodResponse';
import { FileLocker, getFileLocker } from './FileLocker';
import vaulticServer from '../../Core/Server/VaulticServer';
import { File } from "../../Core/Types/File";
import { environment } from '../../Core/Environment';

let directory: string | undefined = undefined;

function getDirectory(): string
{
	if (!directory)
	{
		directory = electronAPI.process.env.APPDATA || (electronAPI.process.platform == 'darwin' ? electronAPI.process.env.HOME + '/Library/Preferences' : electronAPI.process.env.HOME + "/.local/share");
		directory += environment.isTest ? "\\Vaultic\\Test\\DataStores" : "\\Vaultic\\DataStores";
	}

	return directory;
}

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
	const fullPath = getDirectory() + "\\" + fileName;;

	const fileLocker: FileLocker = getFileLocker();

	function checkMakeDataDirectory(): void
	{
		if (!fs.existsSync(getDirectory()))
		{
			try
			{
				fs.mkdirSync(getDirectory());
			}
			catch { }
		}
	}

	async function fileExistsAndHasData(): Promise<boolean>
	{
		await fileLocker.unlock(fileName, getDirectory());

		if (!fs.existsSync(fullPath))
		{
			return false;
		}

		const size = fs.statSync(fullPath).size;

		await fileLocker.lock(fileName, getDirectory());
		return size > 0;
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
			await fileLocker.unlock(fileName, getDirectory());
			unlocked = true;

			await writeFile(fullPath, data);
			wrote = true;

			await fileLocker.lock(fileName, getDirectory());
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
				await fileLocker.lock(fileName, getDirectory());
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
			await fileLocker.unlock(fileName, getDirectory());
			unlocked = true;

			data = await readFile();

			await fileLocker.lock(fileName, getDirectory());
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
				await fileLocker.lock(fileName, getDirectory());
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
