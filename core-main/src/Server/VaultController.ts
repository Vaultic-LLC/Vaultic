import { CreateVaultResponse, GetVaultDataResponse } from "../Types/Responses";
import { AxiosHelper } from "./AxiosHelper";

export interface VaultController
{
    create: () => Promise<CreateVaultResponse>;
    getArchivedVaultData: (userVaultID: number) => Promise<GetVaultDataResponse>;
    unarchiveVault: (userVaultID: number) => Promise<GetVaultDataResponse>;
}

export function createVaultController(axiosHelper: AxiosHelper)
{
    function create(): Promise<CreateVaultResponse>
    {
        return axiosHelper.api.post('Vault/Create', {});
    }

    function getArchivedVaultData(userVaultID: number): Promise<GetVaultDataResponse>
    {
        return axiosHelper.api.post('Vault/GetArchivedVaultData', {
            UserVaultID: userVaultID
        });
    }

    function unarchiveVault(userVaultID: number): Promise<GetVaultDataResponse>
    {
        return axiosHelper.api.post('Vault/UnarchiveVault', {
            UserVaultID: userVaultID
        });
    }

    return {
        create,
        getArchivedVaultData,
        unarchiveVault
    }
}
