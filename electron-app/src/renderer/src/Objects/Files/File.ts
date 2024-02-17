import cryptUtility from '../../Utilities/CryptUtility'

export default class Files
{
	private path: string;

	constructor(fileName: string)
	{
		window.api.checkMakeDataDirectory();
		this.path = `${fileName}.json`
	}

	public async exists(): Promise<boolean>
	{
		return await window.api.fileExistsAndHasData(this.path);
	}

	public async empty(): Promise<void>
	{
		let unlocked: boolean = false;
		try
		{
			await window.api.unlockFile(this.path);
			unlocked = true;

			await window.api.writeFile("", this.path);
			await window.api.lockFile(this.path);

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
				await window.api.lockFile(this.path);
			}
			catch { }
		}
	}

	public async write<T>(key: string, data: T): Promise<void>
	{
		let unlocked: boolean = false;
		try
		{
			await window.api.unlockFile(this.path);
			unlocked = true;

			const jsonData: string = JSON.stringify(data);
			const encryptedData: string = cryptUtility.encrypt(key, jsonData);
			await window.api.writeFile(encryptedData, this.path);

			await window.api.lockFile(this.path);
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
				await window.api.lockFile(this.path);
			}
			catch { }
		}
	}

	public async read<T>(key: string): Promise<T>
	{
		if (!await window.api.fileExistsAndHasData(this.path))
		{
			return {} as T;
		}

		let unlocked: boolean = false;
		try
		{
			await window.api.unlockFile(this.path);
			unlocked = true;

			const data: string = await window.api.readFile(this.path);
			const decryptedData: string = cryptUtility.decrypt(key, data);

			await window.api.lockFile(this.path);
			unlocked = false;

			let obj: T = JSON.parse(decryptedData) as T;
			return obj;
		}
		catch (e)
		{
			console.log(e);
		}

		if (unlocked)
		{
			try
			{
				await window.api.lockFile(this.path);
			}
			catch { }
		}

		return {} as T;
	}
}

