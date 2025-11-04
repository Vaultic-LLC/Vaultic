import crypto from "crypto";
import CoreGeneratorUtility from "../Core/Utilities/CoreGeneratorUtility";
import { ClientGeneratorUtility } from "@vaultic/shared/Types/Utilities";

class GeneratorUtility extends CoreGeneratorUtility implements ClientGeneratorUtility
{
	uniqueId(): string
	{
		return crypto.randomUUID();
	}
}

const generatorUtility = new GeneratorUtility();
export default generatorUtility;
