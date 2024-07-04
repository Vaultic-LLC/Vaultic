import { IIdentifiable } from "./EncryptedData";

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

export type PrimaryDataObjectCollection = "passwords" | "values";

interface ISecondaryDataObject
{
	passwords: string[];
	values: string[];
	type: DataType;
}

export interface Filter extends IIdentifiable, ISecondaryDataObject
{
	[key: string]: any;
	name: string;
	isActive: boolean;
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

export interface Group extends IIdentifiable, ISecondaryDataObject
{
	[key: string]: any;
	name: string;
	color: string; // hex value
}

export enum Size
{
	Small = "small",
	Medium = "medium"
}
