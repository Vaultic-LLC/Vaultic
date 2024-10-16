import { GenerateRandomPhraseResponse } from "@vaultic/shared/Types/Responses";
import { AxiosHelper } from "./AxiosHelper";
import { ValueController } from "@vaultic/shared/Types/Controllers";

export function createValueController(axiosHelper: AxiosHelper): ValueController
{
    async function generateRandomPhrase(length: number): Promise<GenerateRandomPhraseResponse>
    {
        return axiosHelper.api.post('Value/GenerateRandomPhrase', {
            PhraseLength: length
        });
    }

    return {
        generateRandomPhrase
    }
}
