import { Device } from "./Device";
import { ChartData, LicenseStatus, Session, UserDataBreach } from "./ClientServerTypes";

export interface EncryptedResponse
{
    Key?: string;
    Data?: string;
}

export interface BaseResponse
{
    [key: string]: any;
    Success: boolean;
    UnknownError?: boolean;
    InvalidRequest?: boolean;
    logID?: number;
    statusCode?: number;
    axiosCode?: string;
    message?: string;
    vaulticCode?: number;
}

interface InvalidLicenseResponse
{
    LicenseStatus?: LicenseStatus;
}

export interface InvalidSessionResponse extends BaseResponse
{
    InvalidSession?: boolean;
}

export interface DeviceResponse extends BaseResponse
{
    DesktopDeviceUpdatesLeft?: number;
    MobileDeviceUpdatesLeft?: number;
    DesktopDevices?: Device[];
    MobileDevices?: Device[];
}

interface IncorrectDeviceResponse extends DeviceResponse
{
    IncorrectDevice?: boolean;
}

interface EmailIsTakenResposne
{
    EmailIsTaken?: boolean;
}

interface UnknownEmailResponse 
{
    UnknownEmail?: boolean;
}

interface PendingUserResponse
{
    PendingUserToken?: string;
}

export interface OpaqueResponse extends BaseResponse
{
    RestartOpaqueProtocol?: boolean;
}

export interface UserSessionAndDeviceAuthenticationRespons extends BaseResponse, InvalidSessionResponse, IncorrectDeviceResponse
{
}

export interface UseSessionLicenseAndDeviceAuthenticationResponse extends InvalidLicenseResponse, UserSessionAndDeviceAuthenticationRespons
{
}

export interface CreateSessionResponse extends BaseResponse
{
    Session?: Session;
}

export interface ValidateEmailResponse extends BaseResponse
{
    EmailIsTaken?: boolean;
}

export interface ValidateUserResponse extends InvalidLicenseResponse, IncorrectDeviceResponse, CreateSessionResponse
{
    InvalidMasterKey?: boolean;
    UnknownEmail?: boolean;
}

export interface DeleteDeviceResponse extends InvalidSessionResponse, InvalidLicenseResponse
{
    DeviceNotFound?: boolean;
    Url?: string;
}

export interface GetDevicesResponse extends UseSessionLicenseAndDeviceAuthenticationResponse
{

}

export interface LogResponse extends BaseResponse
{
    LogID?: number;
}

export interface DataStoreResponse
{
    filterStoreState?: any;
    groupStoreState?: any;
    passwordStoreState?: any;
    valueStoreState?: any;
}

export interface LoadDataResponse extends DataStoreResponse, InvalidSessionResponse, IncorrectDeviceResponse
{
    appStoreState?: any;
    settingsStoreState?: any;
    userPreferenceStoreState?: any;
}

export interface UpdateDeviceRespnose extends InvalidSessionResponse
{
    Device?: Device;
}

export interface CreateCheckoutResponse extends UserSessionAndDeviceAuthenticationRespons
{
    AlreadyCreated?: boolean;
    Url?: string;
}

export interface GetUserDataBreachesResponse extends UseSessionLicenseAndDeviceAuthenticationResponse
{
    DataBreaches?: UserDataBreach[];
}

export interface GetUserDeactivationKeyResponse extends UseSessionLicenseAndDeviceAuthenticationResponse
{
    DeactivationKey?: string;
}

export interface DeactivateUserSubscriptionResponse extends BaseResponse
{
    UnknownEmail?: boolean;
    IncorrectDeactivationKey?: boolean;
}

export interface GenerateRandomPhraseResponse extends UseSessionLicenseAndDeviceAuthenticationResponse
{
    Phrase?: string;
}

export interface GetChartDataResponse extends UseSessionLicenseAndDeviceAuthenticationResponse
{
    ChartData?: ChartData;
}

export interface StartRegistrationResponse extends BaseResponse, EmailIsTakenResposne, PendingUserResponse, OpaqueResponse
{
    ServerRegistrationResponse?: string;
}

export interface FinishRegistrationResponse extends BaseResponse
{
    // TODO: not needed?
    VaulticPassword?: any;
}

export interface StartLoginResponse extends UnknownEmailResponse, PendingUserResponse, OpaqueResponse
{
    StartServerLoginResponse?: string;
}

export interface FinishLoginResponse extends LoadDataResponse, OpaqueResponse, CreateSessionResponse
{
}

export interface LogUserInResponse extends StartLoginResponse, FinishLoginResponse { }

export interface CreateVaultResponse extends BaseResponse
{
    UserVaultID?: number;
    VaultPreferencesStoreStateID?: number;
    VaultID?: number;
    VaultStoreStateID?: number;
    PasswordStoreStateID?: number;
    ValueStoreStateID?: number;
    FilterStoreStateID?: number;
    GroupStoreStateID?: number;
}

export interface GetUserIDResponse extends BaseResponse
{
    UserID?: number;
    AppStoreStateID?: number;
    UserPreferencesStoreStateID?: number;
}