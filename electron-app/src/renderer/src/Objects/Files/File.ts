import cryptUtility from '../../Utilities/CryptUtility'

export default class Files
{
	private path: string;

	constructor(fileName: string)
	{
		window.api.checkMakeDataDirectory();
		this.path = `${fileName}.json`
	}

	public exists(): boolean
	{
		return window.api.fileExistsAndHasData(this.path);
	}

	public write<T>(key: string, data: T): void
	{
		let unlocked: boolean = false;
		try
		{
			window.api.unlockFile(this.path);
			unlocked = true;

			const jsonData: string = JSON.stringify(data);
			const encryptedData: string = cryptUtility.encrypt(key, jsonData);
			window.api.writeFile(encryptedData, this.path);

			window.api.lockFile(this.path);
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
				window.api.lockFile(this.path);
			}
			catch { }
		}
	}

	public read<T>(key: string): T
	{
		let unlocked: boolean = false;
		try
		{
			window.api.unlockFile(this.path);
			unlocked = true;

			const data: string = window.api.readFile(this.path);
			const decryptedData: string = cryptUtility.decrypt(key, data);

			window.api.lockFile(this.path);
			unlocked = false;

			return JSON.parse(decryptedData) as T;
		}
		catch (e)
		{
			console.log(e);
		}

		if (unlocked)
		{
			try
			{
				window.api.lockFile(this.path);
			}
			catch { }
		}

		return {} as T;
	}
}

