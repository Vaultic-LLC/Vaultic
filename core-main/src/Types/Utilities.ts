import { PublicPrivateKey } from "@vaultic/shared/Types/Keys";
import { ClientGeneratorUtility } from "@vaultic/shared/Types/Utilities";

export interface GeneratorUtility extends ClientGeneratorUtility
{
    publicPrivateKey: () => PublicPrivateKey<string>;
}