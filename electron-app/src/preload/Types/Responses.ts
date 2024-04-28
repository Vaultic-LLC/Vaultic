import { LicenseStatus } from "../Objects/License"
import { Device } from "./Device";
import { Session } from "./Session";

export interface EncryptedResponse
{
	key?: string;
	data?: string;
}

export interface BaseResponse
{
	success: boolean;
	unknownError?: boolean;
	logID?: number;
	statusCode?: number;
	axiosCode?: string;
}

export interface CreateSessionResponse extends BaseResponse
{
	session?: Session;
}

interface IncorrectDeviceResponse extends BaseResponse
{
	IncorrectDevice?: boolean;
	DesktopDeviceUpdatesLeft?: number;
	MobileDeviceUpdatesLeft?: number;
	DesktopDevices?: Device[];
	MobileDevices?: Device[];
}

interface LicenseResponse
{
	licenseStatus?: LicenseStatus;
}

export interface ValidateEmailResponse extends BaseResponse
{
	emailIsTaken?: boolean;
	deviceIsTaken?: boolean;
}

export interface CreateAccountResponse extends ValidateEmailResponse, CreateSessionResponse, DataStoreResponse
{
}

export interface ValidateUserResponse extends LicenseResponse, IncorrectDeviceResponse, CreateSessionResponse
{
	InvalidMasterKey?: boolean;
	UnknownEmail?: boolean;
}

export interface InvalidSessionResponse extends BaseResponse
{
	InvalidSession?: boolean;
}

export interface DeleteDeviceResponse extends InvalidSessionResponse
{
	DeviceNotFound?: boolean;
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
export interface UserSessionAndDeviceAuthenticationRespons extends InvalidSessionResponse, IncorrectDeviceResponse
{
}

export interface UseSessionLicenseAndDeviceAuthenticationResposne extends LicenseResponse, UserSessionAndDeviceAuthenticationRespons
{
}

export interface UpdateDeviceRespnose extends InvalidSessionResponse
{
	Device?: Device;
}

export interface CreateCheckoutResponse extends UserSessionAndDeviceAuthenticationRespons
{
	alreadyCreated?: boolean;
	url?: string;
}
