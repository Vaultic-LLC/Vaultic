import { GenerateRandomPhraseResponse } from "../Types/Responses";
import { AxiosHelper } from "./AxiosHelper";
import { StoreController, createStoreController } from "./StoreController";

export interface ValueController extends StoreController
{
    generateRandomPhrase: (length: number) => Promise<GenerateRandomPhraseResponse>;
}

export function createValueController(axiosHelper: AxiosHelper): ValueController
{
    async function generateRandomPhrase(length: number): Promise<GenerateRandomPhraseResponse>
    {
        return axiosHelper.api.post('Value/GenerateRandomPhrase', {
            PhraseLength: length
        });
    }

    return {
        ...createStoreController("Value", axiosHelper),
        generateRandomPhrase
    }
}
