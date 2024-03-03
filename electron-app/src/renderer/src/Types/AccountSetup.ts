export enum LicenseStatus
{
	NotActivated,
	Active,
	Inactive,
	Cancelled,
	Unknown
};

export interface Device
{
	Name: string;
	Model: string;
	Version: string;
	MacAddress: string;
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
	username: string;
	password: string;
	mfaKey: string;
	createdTime: number;
}

