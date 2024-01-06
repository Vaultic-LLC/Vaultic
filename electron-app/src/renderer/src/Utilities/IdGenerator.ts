import { IIdentifiable } from "../Types/EncryptedData";
import { v4 as uuidv4 } from 'uuid';

class IdGenerator
{
	constructor() { }

	public uniqueId<T extends IIdentifiable>(existingItems: T[]): string
	{
		let hasDuplicate: boolean = true;
		let id: string = "";

		while (hasDuplicate)
		{
			id = uuidv4();
			hasDuplicate = existingItems.some(i => i.id == id);
		}

		return id;
	}
}

const idGenerator = new IdGenerator();
export default idGenerator;
