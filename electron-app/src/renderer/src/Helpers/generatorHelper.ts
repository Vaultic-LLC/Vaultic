import { IIdentifiable } from "@renderer/Types/EncryptedData";

export function generateUniqueID<T extends IIdentifiable>(existingItems: T[]): string
{
	let hasDuplicate: boolean = true;
	let id: string = "";

	while (hasDuplicate)
	{
		id = window.api.utilities.generator.uniqueId();
		hasDuplicate = existingItems.some(i => i.id == id);
	}

	return id;
}
