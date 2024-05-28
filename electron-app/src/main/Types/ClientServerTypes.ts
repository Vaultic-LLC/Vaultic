export interface Session
{
	Token?: string;
	Hash?: string;
}

export interface UserDataBreach
{
	UserDataBreachID: number;
	PasswordID: string;
	BreachedDate: number;
	PasswordsWereBreached: boolean;
	BreachedDataTypes: string;
};

export interface ChartData
{
	Y: number[];
	DataX: number[];
	TargetX: number[];
	Max: number;
}

export enum LicenseStatus
{
	NotActivated,
	Active,
	Inactive,
	Cancelled,
	Unknown
};
