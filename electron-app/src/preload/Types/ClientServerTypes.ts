export interface Session
{
	ID?: number;
	Token?: string;
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
