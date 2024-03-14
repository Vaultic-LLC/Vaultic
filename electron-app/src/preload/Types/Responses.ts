import { LicenseStatus } from "../Objects/License"
import { Device } from "./Device";

export interface BaseResponse
{
	success: boolean;
	UnknownError?: boolean;
	ErrorID?: string;
	StatusCode?: number;
	AxiosCode?: string;
}

export interface CreateSessionResponse extends BaseResponse
{
	AntiCSRFToken?: string;
}

interface IncorrectDeviceResponse extends BaseResponse
{
	IncorrectDevice?: boolean;
	DesktopDeviceUpdatesLeft?: number;
	MobileDeviceUpdatesLeft?: number;
	DesktopDevices?: Device[];
	MobileDevices?: Device[];
}

export interface CheckLicenseResponse extends IncorrectDeviceResponse
{
	LicenseStatus?: LicenseStatus;
	LicenseIsExpired?: boolean;
}

export interface ValidateEmailAndUsernameResponse extends BaseResponse
{
	EmailIsTaken?: boolean;
	UsernameIsTaken?: boolean;
	DeviceIsTaken?: boolean;
}

export interface GenerateMFAResponse extends BaseResponse
{
	MFAKey?: string;
	GeneratedTime?: string;
}

export interface CreateAccountResponse extends CreateSessionResponse
{
	ExpiredMFACode?: boolean;
	InvalidMFACode?: boolean;
	EmailIsTaken?: boolean;
	UsernameIsTaken?: boolean;
	DeviceIsTaken?: boolean;
}

export interface ValidateUsernameAndPasswordResponse extends IncorrectDeviceResponse
{
	IncorrectUsernameOrPassword?: boolean;
}

export interface ValidateMFACodeResponse extends CreateSessionResponse, CheckLicenseResponse
{
	InvalidMFACode?: boolean;
	IncorrectUsernameOrPassword?: boolean;
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
