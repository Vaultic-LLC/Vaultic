import { DataType, Filter, Group } from "./Table";
import { v4 as uuidv4 } from 'uuid';

export interface IIdentifiable
{
	id: string;
}

export interface IFilterable
{
	filters: string[];
}

export interface IGroupable
{
	groups: string[];
}

export interface DisplayField
{
	backingProperty: string;
	displayName: string;
}

export interface HeaderDisplayField extends DisplayField
{
	width: string;
	clickable: boolean;
	padding?: string;
}

export enum PropertyType
{
	String,
	Enum,
	Object
}

export interface PropertySelectorDisplayFields extends DisplayField
{
	type: PropertyType;
	enum?: { [key: string]: string | number };
}

export const PasswordProperties: PropertySelectorDisplayFields[] = [
	{
		backingProperty: "PasswordFor",
		displayName: "Password For",
		type: PropertyType.String,
	},
	{
		backingProperty: "Domain",
		displayName: "Domain",
		type: PropertyType.String,
	},
	{
		backingProperty: "Email",
		displayName: "Email",
		type: PropertyType.String,
	},
	{
		backingProperty: "Login",
		displayName: "Login",
		type: PropertyType.String,
	},
	{
		backingProperty: "AdditionalInformation",
		displayName: "Additional Info",
		type: PropertyType.String,
	},
	{
		backingProperty: "Groups",
		displayName: "Group Name",
		type: PropertyType.Object,
	}
]

export interface Password extends IFilterable, IIdentifiable, IGroupable
{
	[key: string]: any;
	isVaultic: boolean;
	login: string;
	domain: string;
	email: string;
	password: string;
	passwordFor: string;
	securityQuestions: SecurityQuestion[];
	additionalInformation: string;
	lastModifiedTime: string;
	isWeak: boolean;
	isWeakMessage: string;
	containsLogin: boolean;
	passwordLength: number;
	isDuplicate: boolean;
}

export interface SecurityQuestion extends IIdentifiable
{
	question: string,
	questionLength: number,
	answer: string
	answerLength: number
}

export enum NameValuePairType
{
	Verbal = "Verbal Code",
	Passcode = "Passcode",
	Safe = "Safe",
	Information = "Information",
	MFAKey = "MFA Key",
	Other = "Other",
}

export const ValueProperties: PropertySelectorDisplayFields[] = [
	{
		backingProperty: "Name",
		displayName: "Name",
		type: PropertyType.String,
	},
	{
		backingProperty: "AdditionalInformation",
		displayName: "Additional Info",
		type: PropertyType.String,
	},
	{
		backingProperty: "ValueType",
		displayName: "Type",
		type: PropertyType.Enum,
		enum: NameValuePairType,
	},
	{
		backingProperty: "Groups",
		displayName: "Group Name",
		type: PropertyType.Object,
	}
]

export interface NameValuePair extends IFilterable, IIdentifiable, IGroupable
{
	[key: string]: any;
	name: string;
	value: string;
	valueType?: NameValuePairType;
	notifyIfWeak: boolean;
	additionalInformation: string;
	lastModifiedTime: string;
	isDuplicate: boolean;
	isWeak: boolean;
	isWeakMessage: string;
	valueLength: number;
}

export interface CurrentAndSafeStructure
{
	current: number[];
	safe: number[];
}

export enum AtRiskType
{
	Old,
	Duplicate,
	Weak,
	WeakVerabl,
	ContainsLogin,
	Breached,
	Empty,
	None
}

export interface AtRisks
{
	isOld?: boolean;
	isWeak?: boolean;
	isWeakMessage?: string;
	containsLogin?: boolean;
	isDuplicate?: boolean;
	isEmpty?: boolean;
}

export function defaultPassword(): Password
{
	return {
		id: "",
		key: "",
		isVaultic: false,
		passwordFor: '',
		login: '',
		domain: '',
		email: '',
		password: '',
		passwordLength: 0,
		securityQuestions: [],
		additionalInformation: '',
		lastModifiedTime: '',
		isDuplicate: false,
		isWeak: false,
		isWeakMessage: '',
		containsLogin: false,
		filters: [],
		groups: [],
	}
}

export function defaultValue(): NameValuePair
{
	return {
		id: "",
		key: '',
		name: '',
		value: '',
		notifyIfWeak: true,
		additionalInformation: '',
		lastModifiedTime: '',
		isDuplicate: false,
		filters: [],
		groups: [],
		isWeak: false,
		isWeakMessage: '',
		valueLength: 0
	}
}

export function defaultFilter(type: DataType): Filter
{
	return {
		id: "",
		key: '',
		passwords: [],
		values: [],
		type: type,
		isActive: false,
		name: '',
		conditions: [{
			id: uuidv4(),
			property: '',
			value: ''
		}]
	}
}

export function defaultGroup(type: DataType): Group
{
	return {
		id: "",
		key: "",
		passwords: [],
		values: [],
		name: '',
		type: type,
		color: ''
	}
}

export interface DataFile
{
	exists: () => Promise<boolean>;
	write: (data: string) => Promise<MethodResponse>;
	read: () => Promise<MethodResponse>;
}

export interface MethodResponse
{
	success: boolean;
	logID?: number;
	value?: string;
}
