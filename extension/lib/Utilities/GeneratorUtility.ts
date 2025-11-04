import { ClientGeneratorUtility } from "@vaultic/shared/Types/Utilities";
import CoreGeneratorUtility from "../Main/Utilities/CoreGeneratorUtility";
import { Promisify } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { RandomValueType } from "@vaultic/shared/Types/Fields";
import { PublicPrivateKey } from "@vaultic/shared/Types/Keys";

class GeneratorUtility extends CoreGeneratorUtility implements ClientGeneratorUtility
{
	uniqueId(): string
	{
		return crypto.randomUUID();
	}
}

export const generatorUtility: GeneratorUtility = new GeneratorUtility();

export class PromisifyGeneratorUtility implements Promisify<ClientGeneratorUtility>
{
	async uniqueId(): Promise<string>
	{
        return generatorUtility.uniqueId();
	}

    async generateRandomPasswordOrPassphrase(type: RandomValueType, length: number, includeNumbers: boolean, includeSpecialCharacters: boolean, includeAbmiguousCharacters: boolean, passphraseSeperator: string): Promise<string>
	{
		return generatorUtility.generateRandomPasswordOrPassphrase(type, length, includeNumbers, includeSpecialCharacters, includeAbmiguousCharacters, passphraseSeperator);
	}

    async ECKeys(): Promise<PublicPrivateKey<string>>
    {
        return generatorUtility.ECKeys();
    }
}