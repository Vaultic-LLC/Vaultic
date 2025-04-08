import { Device, RequireMFAOn } from "./Device";
import { ChartData, LicenseStatus, OrganizationInfo, ServerAllowSharingFrom, Session, UserDataPayload, UserDemographics, UserOrgInfo, VaultDataBreach } from "./ClientServerTypes";
import { KSFParams, PublicKeys } from "./Keys";

export interface EncryptedResponse
{
    CipherText: string;
    Data: string;
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
    Salt?: string;
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
    DesktopDevices?: Device[];
    MobileDevices?: Device[];
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

export interface UserSessionAndDeviceAuthenticationRespons extends BaseResponse, InvalidSessionResponse
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
    PendingUserToken?: string;
    EmailIsTaken?: boolean;
    Code?: string;
}

export interface VerifyEmailResponse extends BaseResponse
{
    InvalidPendingUser?: boolean;
    IncorrectEmailVerificationCode?: boolean;
}

export interface ValidateUserResponse extends InvalidLicenseResponse, CreateSessionResponse
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
    RegisteredCurrentDesktopDeviceID?: number;
    RegisteredCurrentMobileDeviceID?: number;
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

export interface GetVaultDataBreachesResponse extends UseSessionLicenseAndDeviceAuthenticationResponse
{
    DataBreaches?: VaultDataBreach[];
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

export interface StartRegistrationResponse extends BaseResponse, EmailIsTakenResposne, OpaqueResponse
{
    ServerRegistrationResponse?: string;
    InvalidPendingUser?: boolean;
}

export interface FinishRegistrationResponse extends BaseResponse, OpaqueResponse
{
    MFASecret?: string;
    InvalidPendingUser?: boolean;
}

export interface StartLoginResponse extends UnknownEmailResponse, PendingUserResponse, OpaqueResponse
{
    StartServerLoginResponse?: string;
    FailedMFA?: boolean;
}

export interface UserDataPayloadResponse
{
    userDataPayload?: UserDataPayload;
}

export interface FinishLoginResponse extends UserDataPayloadResponse, OpaqueResponse, CreateSessionResponse
{
    masterKey?: string;
}

export interface LogUserInResponse extends StartLoginResponse, FinishLoginResponse 
{
    isSyncing?: boolean;
}

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
    OrganizationInfo?: OrganizationInfo[];
}

export interface GetSettings extends BaseResponse 
{
    Username?: string;
    RequireMFAOn?: RequireMFAOn;
    AllowSharedVaultsFromOthers?: boolean;
    AllowSharingFrom?: ServerAllowSharingFrom;
    AllowSharingFromUsers?: UserDemographics[];
}

export interface UpdateSharingSettingsResponse extends BaseResponse
{
    UsernameIsTaken?: boolean;
}

export interface SearchForUsersResponse extends BaseResponse
{
    Users?: UserDemographics[];
}

export interface GetVaultMembersResponse extends BaseResponse
{
    UserOrgInfo?: UserOrgInfo[];
}

export interface GetPublicKeysResponse extends BaseResponse
{
    UsersAndPublicKeys?: { [key: number]: PublicKeys };
}

export interface CreateOrganizationResponse extends BaseResponse
{
    OrganizationID?: number;
}

export interface SyncVaultsResponse extends UserDataPayloadResponse, BaseResponse { }

export interface GetMFAKeyResponse extends BaseResponse
{
    MFAKey?: string;
}

export interface RegisterDeviceResponse extends BaseResponse
{
    UserDesktopDeviceID?: number;
    UserMobileDeviceID?: number;
}

export interface GetUserInfoResponse extends BaseResponse
{
    LicenseStatus?: LicenseStatus;
}