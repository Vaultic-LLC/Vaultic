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
	success: boolean;
	UnknownError?: boolean;
	ErrorID?: string;
	StatusCode?: number;
	AxiosCode?: string;
}

export interface Device extends IIdentifiable
{
	[key: string]: any;
	UserDesktopDeviceID?: number;
	UserMobileDeviceID?: number;
	Name: string;
	Model: string;
	Version: string;
	MacAddress: string;
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

