import axios from 'axios';
import { getDeviceInfo } from './DeviceInfo';
import { BaseResponse, CheckLicenseResponse, CreateAccountResponse, GenerateMFAResponse, ValidateEmailAndUsernameResponse, ValidateMFACodeResponse, ValidateUsernameAndPasswordResponse } from '../Types/Responses';
import currentLicense, { LicenseStatus } from './License';
import cryptUtility, { internalEncrypt } from '../Utilities/CryptUtility';

export interface VaulticServer
{
	checkLicense: (license: string) => Promise<CheckLicenseResponse>;
	validateUsernameAndPassword: (username: string, password: string) => Promise<ValidateUsernameAndPasswordResponse>;
	validateEmailAndUsername: (email: string, username: string) => Promise<ValidateEmailAndUsernameResponse>;
	generateMFA: () => Promise<GenerateMFAResponse>;
	createAccount: (firstName: string, lastName: string, email: string, username: string, password: string,
		mfaKey: string, mfaCode: string, createdTime: number) => Promise<CreateAccountResponse>;
	validateMFACode(username: string, password: string, mfaCode: string): Promise<ValidateMFACodeResponse>;
	syncUserData: (key: string, appData: string, settingsData: string, passwordsValueData: string, filterData: string, groupData: string) => Promise<any>;
	getUserData: () => Promise<any>;
	addFilter: (data: string) => Promise<any>;
	updateFilter: (data: string) => Promise<any>;
	deleteFilter: (data: string) => Promise<any>;
}

const APIKeyEncryptionKey = "12fasjkdF2owsnFvkwnvwe23dFSDfio2"
const apiKeyPrefix = "ThisIsTheStartOfTheAPIKey!!!Yahooooooooooooo1234444321-";

const axiosInstance = axios.create({
	baseURL: 'https://localhost:7007/',
	timeout: 99999999999,
	headers: { 'X-M': getDeviceInfo().mac },
	//responseType: 'json',
});

function getAPIKey()
{
	const date = new Date();
	const string = `${apiKeyPrefix}${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}`;

	const encrypt = internalEncrypt(APIKeyEncryptionKey, string, true);

	return encrypt;
}

async function post<T extends BaseResponse>(serverPath: string, data: any): Promise<T | BaseResponse>
{
	try
	{
		const apiKey = await getAPIKey();
		const response = await axiosInstance.post(serverPath, data, { headers: { "X-AK": apiKey } });
		return response.data;
	}
	catch (e)
	{
		// something went wrong
		// Create an ID using a GUID and log to server. Present user with ID when mentioning that
		// an error occurred and to reach out to cusotmer service with the ID if the issue persists
	}

	return { Success: false, UnknownError: true };
}

async function get<T extends BaseResponse>(serverPath: string): Promise<T | BaseResponse>
{
	try
	{
		const apiKey = await getAPIKey();
		const response = await axiosInstance.get(serverPath, { headers: { "X-AK": apiKey } });
		return response.data;
	}
	catch (e)
	{
		// something went wrong
	}

	return { Success: false, UnknownError: true };
}

async function checkLicense(license: string): Promise<CheckLicenseResponse>
{
	if (!license)
	{
		return { Success: false, LicenseStatus: LicenseStatus.Unknown };
	}

	return post("License/CheckLicenseKey", { License: license });
}

function validateEmailAndUsername(email: string, username: string): Promise<ValidateEmailAndUsernameResponse>
{
	return post('Account/ValidateEmailAndUsername', {
		Email: email,
		Username: username
	});
}

function generateMFA(): Promise<GenerateMFAResponse>
{
	return get('Account/GenerateMFA');
}

function createAccount(firstName: string, lastName: string, email: string, username: string, password: string,
	mfaKey: string, mfaCode: string, createdTime: number): Promise<CreateAccountResponse>
{
	return post('Account/CreateAccount', {
		FirstName: firstName,
		LastName: lastName,
		Email: email,
		Username: username,
		Password: password,
		MFAKey: mfaKey,
		MFACode: mfaCode,
		CreatedTime: createdTime,
		DeviceName: getDeviceInfo().deviceName
	});
}

async function validateUsernameAndPassword(username: string, password: string): Promise<ValidateUsernameAndPasswordResponse>
{
	return post('Account/ValidateEmailAndUsername', {
		Username: username,
		Password: password,
	});
}

async function validateMFACode(username: string, password: string, mfaCode: string): Promise<ValidateMFACodeResponse>
{
	return post('Account/ValidateMFACode', {
		Username: username,
		Password: password,
		MFACode: mfaCode,
	});
}

async function syncUserData(key: string, appData: string, settingsData: string, passwordsValueData: string, filterData: string, groupData: string)
{
	return post('Account/SyncUserData', {
		License: currentLicense.key,
		AppData: cryptUtility.encrypt(key, appData),
		SettingsData: cryptUtility.encrypt(key, settingsData),
		PasswordsValueData: cryptUtility.encrypt(key, passwordsValueData),
		FilterData: cryptUtility.encrypt(key, filterData),
		GroupData: cryptUtility.encrypt(key, groupData)
	});
}

async function getUserData(): Promise<any>
{
	return post('Account/GetUserData', {
		License: currentLicense.key,
	});
}

async function addFilter(data: string): Promise<any>
{
	return post('Filter/Add', data);
}

async function updateFilter(data: string): Promise<any>
{
	return post('Filter/Update', data);
}

async function deleteFilter(data: string): Promise<any>
{
	return post('Filter/Delete', data);
}

const vaulticServer: VaulticServer =
{
	checkLicense,
	validateUsernameAndPassword,
	validateEmailAndUsername,
	generateMFA,
	createAccount,
	validateMFACode,
	syncUserData,
	getUserData,
	addFilter,
	updateFilter,
	deleteFilter
};

export default vaulticServer;
