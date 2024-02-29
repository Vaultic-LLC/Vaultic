import { IIdentifiable, IPinnable, NameValuePair, Password } from "./EncryptedData";
import { v4 as uuidv4 } from 'uuid';

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
	key: string;
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
	key: string;
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
