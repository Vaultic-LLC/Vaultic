import { BaseResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, GenerateRandomPhraseResponse, GetChartDataResponse, GetDevicesResponse, GetUserDataBreachesResponse, LogResponse, UseSessionLicenseAndDeviceAuthenticationResponse, ValidateEmailResponse } from "./Responses";

export interface AppController
{
    log: (exception: string, stack: string) => Promise<LogResponse>;
}

export interface SessionController
{
    expire: () => Promise<BaseResponse>;
}

export interface ClientUserController
{
    validateEmail(email: string): Promise<ValidateEmailResponse>;
    deleteDevice: (masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => Promise<DeleteDeviceResponse>;
    createCheckout: () => Promise<CreateCheckoutResponse>;
    getChartData: (data: string) => Promise<GetChartDataResponse>;
    getUserDataBreaches: (passwordStoreState: string) => Promise<GetUserDataBreachesResponse>;
    dismissUserDataBreach: (breachID: number) => Promise<BaseResponse>;
    deactivateUserSubscription: (email: string, deactivationKey: string) => Promise<DeactivateUserSubscriptionResponse>;
    getDevices: () => Promise<GetDevicesResponse>;
    reportBug: (description: string) => Promise<UseSessionLicenseAndDeviceAuthenticationResponse>;
}

export interface ValueController
{
    generateRandomPhrase: (length: number) => Promise<GenerateRandomPhraseResponse>;
}

export interface ClientVaultController 
{
    deleteVault: (userVaultID: number) => Promise<BaseResponse>;
}