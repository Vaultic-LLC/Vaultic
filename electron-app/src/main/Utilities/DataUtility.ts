import { CoreDataUtility } from "../Core/Utilities/CoreDataUtility";
import { deflate, inflate } from "zlib";

export class DataUtility extends CoreDataUtility
{
	async compress(value: string): Promise<string>
	{
		return new Promise((resolve) =>
		{
			deflate(Buffer.from(value, 'utf-8'), (err, result) =>
			{
				if (err)
				{
					resolve('');
					return;
				}

				resolve(result.toString('latin1'));
			});
		});
	}

	async uncompress(value: string): Promise<string>
	{
		return new Promise((resolve) =>
		{
			inflate(Buffer.from(value, 'latin1'), (err, result) =>
			{
				if (err)
				{
					resolve('');
					return;
				}

				resolve(result.toString('utf-8'));
			});
		});
	}
}
