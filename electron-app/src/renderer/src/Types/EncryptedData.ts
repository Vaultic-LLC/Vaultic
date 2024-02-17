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

export interface IPinnable
{
	isPinned: boolean;
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
		backingProperty: "passwordFor",
		displayName: "Password For",
		type: PropertyType.String,
	},
	{
		backingProperty: "domain",
		displayName: "Domain",
		type: PropertyType.String,
	},
	{
		backingProperty: "email",
		displayName: "Email",
		type: PropertyType.String,
	},
	{
		backingProperty: "login",
		displayName: "Login",
		type: PropertyType.String,
	},
	{
		backingProperty: "additionalInformation",
		displayName: "Additional Info",
		type: PropertyType.String,
	},
	{
		backingProperty: "groups",
		displayName: "Group Name",
		type: PropertyType.Object,
	}
]

export interface Password extends IFilterable, IIdentifiable, IGroupable, IPinnable
{
	[key: string]: any;
	login: string;
	domain: string;
	email: string;
	password: string;
	passwordFor: string;
	securityQuestions: SecurityQuestion[];
	additionalInformation: string;
	lastModifiedTime: number;
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
	Other = "Other"
}

export const ValueProperties: PropertySelectorDisplayFields[] = [
	{
		backingProperty: "name",
		displayName: "Name",
		type: PropertyType.String,
	},
	{
		backingProperty: "additionalInformation",
		displayName: "Additional Info",
		type: PropertyType.String,
	},
	{
		backingProperty: "valueType",
		displayName: "Type",
		type: PropertyType.Enum,
		enum: NameValuePairType,
	},
	{
		backingProperty: "groups",
		displayName: "Group Name",
		type: PropertyType.Object,
	}
]

export interface NameValuePair extends IFilterable, IIdentifiable, IGroupable, IPinnable
{
	[key: string]: any;
	name: string;
	value: string;
	valueType?: NameValuePairType;
	notifyIfWeak: boolean;
	additionalInformation: string;
	lastModifiedTime: number;
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
		passwordFor: '',
		login: '',
		domain: '',
		email: '',
		password: '',
		passwordLength: 0,
		securityQuestions: [{
			id: uuidv4(),
			question: '',
			questionLength: 0,
			answer: '',
			answerLength: 0
		}],
		additionalInformation: '',
		lastModifiedTime: 0,
		isDuplicate: false,
		isPinned: false,
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
		name: '',
		value: '',
		notifyIfWeak: true,
		additionalInformation: '',
		lastModifiedTime: 0,
		isDuplicate: false,
		isPinned: false,
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
		nameValuePairs: [],
		isPinned: false,
		type: type,
		isActive: false,
		text: '',
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
		nameValuePairs: [],
		isPinned: false,
		name: '',
		type: type,
		color: ''
	}
}
