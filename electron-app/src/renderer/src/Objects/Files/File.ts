import path from 'path';
import fs from 'fs';
import cryptUtility from '../../Utilities/CryptUtility'
import { stores } from '../Stores';

export default class Files
{
	private path: string;

	constructor(fileName: string)
	{
		this.path = "";
		this.path = path.join(window.userData + "/PasswordSafe", fileName + '.json');
	}

	private lock()
	{
		if (stores.appStore.isWindows)
		{
			//@ts-ignore
			window.api.child_process.spawn("cacls", [this.path, "/P", "everyone:n"]);
		}
		else
		{
			// linux command
		}
	}

	private unlock(): boolean
	{
		if (stores.appStore.isWindows)
		{
			//@ts-ignore
			window.api.child_process.spawn("cacls", [this.path, "/P", "everyone:f"]);
		}
		else
		{
			// linux command
		}

		return true;
	}

	public async write<T>(key: string, data: T): Promise<void>
	{
		this.unlock();

		const jsonData: string = JSON.stringify(data);

		return new Promise((resolve, reject) =>
		{
			fs.writeFile(this.path, cryptUtility.encrypt(key, jsonData), { encoding: 'utf8' }, () =>
			{
				this.lock();
				resolve()
			});
		});

	}

	public async read<T>(key: string): Promise<T>
	{
		this.unlock();

		return new Promise((resolve, reject) =>
		{
			fs.readFile(this.path, { encoding: 'utf8' }, (err, data) =>
			{
				const decryptedData: string = cryptUtility.decrypt(key, data);
				this.lock();

				resolve(JSON.parse(decryptedData) as T);
			});
		})
	}
}

