import cryptUtility from '../../Utilities/CryptUtility'

export default class Files
{
	private path: string;

	constructor(fileName: string)
	{
		window.api.checkMakeDataDirectory();
		this.path = `${fileName}.json`
	}

	public async write<T>(key: string, data: T): Promise<void>
	{
		try
		{
			return new Promise((resolve, reject) =>
			{
				window.api.unlockFile(this.path).then(() =>
				{
					const jsonData: string = JSON.stringify(data);
					const encryptedData: string = cryptUtility.encrypt(key, jsonData);
					window.api.writeFile(encryptedData, this.path);

					window.api.lockFile(this.path).then(() =>
					{
						resolve();
					});
				});
			})

		}
		catch (e)
		{
			console.log(e);
		}
	}

	public async read<T>(key: string): Promise<T>
	{
		try
		{
			return new Promise<T>((resolve, reject) =>
			{
				window.api.unlockFile(this.path).then(() =>
				{
					console.log('reading');
					const data: string = window.api.readFile(this.path);
					console.log('Data read in ' + data);
					const decryptedData: string = cryptUtility.decrypt(key, data);
					console.log('Decrypted Data ' + decryptedData);
					window.api.lockFile(this.path).then(() =>
					{
						resolve(JSON.parse(decryptedData) as T);
					});
				});
			})

		}
		catch (e)
		{
			console.log(e);
		}

		return Promise.resolve({} as T);
	}
}

