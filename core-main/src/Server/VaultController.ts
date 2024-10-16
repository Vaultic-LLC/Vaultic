import { CreateVaultResponse, GetVaultDataResponse, BaseResponse } from "@vaultic/shared/Types/Responses";
import { AxiosHelper } from "./AxiosHelper";
import { ClientVaultController } from "@vaultic/shared/Types/Controllers";

export interface VaultController extends ClientVaultController
{
    create: () => Promise<CreateVaultResponse>;
    getArchivedVaultData: (userVaultID: number) => Promise<GetVaultDataResponse>;
    unarchiveVault: (userVaultID: number) => Promise<GetVaultDataResponse>;
    failedToSaveVault: (userVaultID: number) => Promise<BaseResponse>;
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

    function deleteVault(userVaultID: number): Promise<GetVaultDataResponse>
    {
        return axiosHelper.api.post('Vault/DeleteVault', {
            UserVaultID: userVaultID
        });
    }

    function failedToSaveVault(userVaultID: number): Promise<BaseResponse>
    {
        return axiosHelper.api.post('Vault/FailedToSaveVault', {
            UserVaultID: userVaultID
        });
    }

    return {
        create,
        getArchivedVaultData,
        unarchiveVault,
        deleteVault,
        failedToSaveVault
    }
}
