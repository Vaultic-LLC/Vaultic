import { IIdentifiable } from "./EncryptedData";

export enum LicenseStatus
{
	NotActivated,
	Active,
	Inactive,
	Cancelled,
	Unknown
};

export interface BaseResponse
{
	Success: boolean;
	unknownError?: boolean;
	logID?: number;
	statusCode?: number;
	axiosCode?: string;
	message?: string;
}

export interface Device extends IIdentifiable
{
	[key: string]: any;
	UserDesktopDeviceID?: number;
	UserMobileDeviceID?: number;
	Name: string;
	Model: string;
	Version: string;
	Type: string;
}

export interface IncorrectDeviceResponse
{
	IncorrectDevice?: boolean;
	DesktopDeviceUpdatesLeft?: number;
	MobileDeviceUpdatesLeft?: number;
	DesktopDevices?: Device[];
	MobileDevices?: Device[];
}

export interface LicenseResponse
{
	Success: boolean;
	Expiration?: string;
	Key?: string;
	LicenseIsExpired?: boolean;
	IncorrectDevice?: boolean;
	DeviceUpdatesLeft?: number;
	Devices?: Device[];
	UnknownLicense?: boolean;
	LicenseStatus?: LicenseStatus;
}

export interface Account
{
	firstName: string;
	lastName: string;
	email: string;
	masterKey: string;
}

export interface UserDataBreach
{
	UserDataBreachID: number;
	PasswordID: string;
	BreachedDate: number;
	PasswordsWereBreached: boolean;
	BreachedDataTypes: string;
};
