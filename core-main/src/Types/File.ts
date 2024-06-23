import { MethodResponse } from "./MethodResponse";

export interface File
{
	exists: () => Promise<boolean>;
	write: (data: string) => Promise<MethodResponse>;
	read: () => Promise<MethodResponse>;
}

export interface Files
{
	app: File;
	settings: File;
	password: File;
	value: File;
	filter: File;
	group: File;
	userPreferences: File;
}
