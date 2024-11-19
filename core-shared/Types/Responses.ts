import { Device } from "./Device";
import { ChartData, LicenseStatus, OrganizationAndUsers, Session, UserDataBreach, UserDataPayload } from "./ClientServerTypes";

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

export interface IncorrectDeviceResponse extends DeviceResponse
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
    VaulticPassword?: any;
    PublicKey?: string;
    PrivateKey?: string;
}

export interface StartLoginResponse extends UnknownEmailResponse, PendingUserResponse, OpaqueResponse
{
    StartServerLoginResponse?: string;
}

export interface UserDataPayloadResponse
{
    userDataPayload?: UserDataPayload;
}

export interface FinishLoginResponse extends UserDataPayloadResponse, OpaqueResponse, CreateSessionResponse
{
}

export interface LogUserInResponse extends StartLoginResponse, FinishLoginResponse { }

export interface CreateVaultResponse extends BaseResponse
{
    UserOrganizationID?: number;
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

export interface GetVaultDataResponse extends BaseResponse, UserDataPayloadResponse { }

export interface BackupResponse extends BaseResponse, UserDataPayloadResponse { }

export interface GetOrganizationsResponse extends BaseResponse
{
    OrganizationsAndUsers?: OrganizationAndUsers[];
}

