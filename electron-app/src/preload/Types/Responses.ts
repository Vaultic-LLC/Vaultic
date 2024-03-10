import { LicenseStatus } from "../Objects/License"
import { Device } from "./Device";

export interface BaseResponse
{
	Success: boolean;
	UnknownError?: boolean;
	ErrorID?: string;
	StatusCode?: number;
}

export interface CreateSessionResponse extends BaseResponse
{
	AntiCSRFToken?: string;
}

interface DeviceSensitiveResponse extends BaseResponse
{
	IncorrectDevice?: boolean;
	DeviceUpdatesLeft?: number;
	Devices?: Device[];
}

export interface CheckLicenseResponse extends DeviceSensitiveResponse
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

export interface ValidateUsernameAndPasswordResponse extends DeviceSensitiveResponse
{
	IncorrectUsernameOrPassword?: boolean;
}

export interface ValidateMFACodeResponse extends CreateSessionResponse, CheckLicenseResponse
{
	InvalidMFACode?: boolean;
	IncorrectUsernameOrPassword?: boolean;
}
