import { VaulticHelper } from "@vaultic/shared/Types/Helpers";
import { GetUserDeactivationKeyResponse } from "@vaultic/shared/Types/Responses";

export class CVaulticHelper implements VaulticHelper
{
    downloadDeactivationKey(): Promise<GetUserDeactivationKeyResponse>
    {
        throw new Error("Not implemented");
    }
    
    readCSV(): Promise<[boolean, string]>
    {
        throw new Error("Not implemented");
    }

    writeCSV(fileName: string, data: string): Promise<boolean>
    {
        throw new Error("Not implemented");
    }
}
