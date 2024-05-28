import { Device } from "./Device";
import { ChartData, LicenseStatus, Session, UserDataBreach } from "./ClientServerTypes";

export interface EncryptedResponse
{
	Key?: string;
	Data?: string;
}

export interface BaseResponse
{
	Success: boolean;
	UnknownError?: boolean;
	logID?: number;
	statusCode?: number;
	axiosCode?: string;
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

interface InvalidMasterKeyResponse
{
	InvalidMasterKey?: boolean;
}

export interface UserSessionAndDeviceAuthenticationRespons extends BaseResponse, InvalidSessionResponse, IncorrectDeviceResponse
{
}

export interface UseSessionLicenseAndDeviceAuthenticationResponse extends InvalidLicenseResponse, UserSessionAndDeviceAuthenticationRespons
{
}

export interface UseSessionLicenseDeviceAndMasterKeyAuthenticationResponse extends UseSessionLicenseAndDeviceAuthenticationResponse, InvalidMasterKeyResponse
{
}

export interface UserSessionLicenseAndMasterKeyAuthentication extends InvalidSessionResponse, InvalidLicenseResponse, InvalidMasterKeyResponse
{

}

export interface MutateStoreResponse extends UseSessionLicenseDeviceAndMasterKeyAuthenticationResponse, EmailIsTakenResposne
{
}

export interface CreateSessionResponse extends BaseResponse
{
	session?: Session;
}

export interface ValidateEmailResponse extends BaseResponse
{
	EmailIsTaken?: boolean;
}

export interface CreateAccountResponse extends ValidateEmailResponse, CreateSessionResponse, DataStoreResponse
{
}

export interface ValidateUserResponse extends InvalidLicenseResponse, IncorrectDeviceResponse, CreateSessionResponse
{
	InvalidMasterKey?: boolean;
	UnknownEmail?: boolean;
}

export interface DeleteDeviceResponse extends UserSessionLicenseAndMasterKeyAuthentication
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
