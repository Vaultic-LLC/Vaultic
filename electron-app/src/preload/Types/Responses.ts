import { LicenseStatus } from "../Objects/License"
import { Device } from "./Device";

interface BaseResponse
{
	Success: boolean;
	UnknownError?: boolean;
}

interface DeviceSensitiveResponse extends BaseResponse
{
	IncorrectDevice?: boolean;
	DeviceUpdatesLeft?: number;
	Devices?: Device[];
}

interface LicenseResponse extends DeviceSensitiveResponse
{
	Expiration?: string;
	Key?: string;
}

export interface CheckLicenseResponse extends LicenseResponse
{
	LicenseIsExpired?: boolean;
	UnknownLicense?: boolean;
	LicenseStatus?: LicenseStatus;
}

export interface ValidateEmailAndUsernameResponse extends BaseResponse
{
	EmailIsTaken?: boolean;
	UsernameIsTaken?: boolean;
}

export interface GenerateMFAResponse extends BaseResponse
{
	MFAKey?: string;
	GeneratedTime?: string;
}

export interface CreateAccountResponse extends LicenseResponse
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

export interface ValidateMFACodeResponse extends LicenseResponse
{
	InvalidMFACode?: boolean;
	IncorrectUsernameOrPassword?: boolean;
}
