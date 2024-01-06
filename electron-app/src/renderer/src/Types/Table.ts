import { IIdentifiable, IPinnable } from "./EncryptedData";

export enum DataType
{
	Passwords,
	NameValuePairs,
	Filters,
	Groups
}

export enum FilterStatus
{
	And = "And",
	Or = "Or"
}

export interface Filter extends IIdentifiable, IPinnable
{
	[key: string]: any;
	passwords: string[];
	nameValuePairs: string[];
	type: DataType;
	isActive: boolean;
	text: string;
	conditions: FilterCondition[];
}

export interface FilterCondition extends IIdentifiable
{
	property: string;
	filterType?: FilterConditionType;
	value: string;
}

export enum EqualFilterConditionType
{
	EqualTo = "Equal To"
}

export enum FilterConditionType
{
	StartsWith = "Starts With",
	EndsWith = "Ends With",
	Contains = "Contains",
	EqualTo = "Equal To"
}

export interface Group extends IIdentifiable, IPinnable
{
	[key: string]: any;
	passwords: string[];
	nameValuePairs: string[];
	type: DataType;
	name: string;
	color: string; // hex value
}

export enum Size
{
	Small = "small",
	Medium = "medium"
}
