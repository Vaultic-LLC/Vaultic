import { CoreDataUtility } from "../Core/Utilities/CoreDataUtility";
import { deflate, inflate } from "zlib";

export class DataUtility extends CoreDataUtility
{
	async compress(value: string): Promise<string>
	{
		return new Promise((resolve) =>
		{
			deflate(Buffer.from(value, 'utf8'), (err, result) =>
			{
				if (err)
				{
					resolve('');
					return;
				}

				resolve(result.toString('base64'));
			});
		});
	}

	async uncompress(value: string): Promise<string>
	{
		return new Promise((resolve) =>
		{
			try
			{
				inflate(Buffer.from(value, 'base64'), (err, result) =>
				{
					if (err)
					{
						// May be due to old data format, try to uncompress with latin1
						inflate(Buffer.from(value, 'latin1'), (err, result) =>
						{
							if (err)
							{
								resolve(err);
								return;
							}

							resolve(result.toString('utf8'));
						});
						return;
					}

					resolve(result.toString('utf8'));
				});
			}
			catch (err)
			{
				inflate(Buffer.from(value, 'latin1'), (err, result) =>
				{
					if (err)
					{
						resolve(err);
						return;
					}

					resolve(result.toString('utf8'));
				});
			}
		});
	}
}
