import { CreateVaultResponse } from "../Types/Responses";
import { AxiosHelper } from "./AxiosHelper";

export interface VaultController
{
    create: () => Promise<CreateVaultResponse>;
}

export function createVaultController(axiosHelper: AxiosHelper)
{
    function create(): Promise<CreateVaultResponse>
    {
        return axiosHelper.api.post('Vault/Create', {});
    }

    return {
        create
    }
}
