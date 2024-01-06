// import path from 'path';
// import fs from 'fs/promises';
// import { spawn } from 'child_process';
// import cryptUtility from '../../Utilities/CryptUtility'
import { stores } from '../Stores';
// import { remote } from "electron";

export default class Files
{
	private path: string;
	private encrypt: boolean;

	constructor(fileName: string, encrypt: boolean)
	{
		this.path = "";
		// this.path = path.join(remote.app.getPath('appData'), fileName + '.json');
		this.encrypt = encrypt;
	}

	private lock()
	{
		if (stores.appStore.isWindows)
		{
			// spawn("cacls", [this.path, "/P", "everyone:n"]);
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
			// spawn("cacls", [this.path, "/P", "everyone:f"]);
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
		if (this.encrypt)
		{
			// await fs.writeFile(this.path, cryptUtility.encrypt(key, jsonData), 'utf-8');
		}
		else
		{
			// await fs.writeFile(this.path, jsonData, 'utf-8');
		}

		this.lock();
	}

	public async read<T>(key: string): Promise<T>
	{
		this.unlock();

		// let readData: string = "";
		// const fileContents: string = await fs.readFile(this.path, 'utf-8');

		if (this.encrypt)
		{
			// readData = cryptUtility.decrypt(key, fileContents);
		}

		this.lock();
		// return JSON.parse(readData) as T;
		return Promise.resolve({} as T);
	}
}

