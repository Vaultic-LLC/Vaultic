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
}

const APIKeyEncryptionKey = "12fasjkdF2owsnFvkwnvwe23dFSDfio2"
const apiKeyPrefix = "ThisIsTheStartOfTheAPIKey!!!Yahooooooooooooo1234444321";
const apiKeyHeader = "X-AK";

const axiosInstance = axios.create({
	baseURL: 'https://localhost:7007/',
	timeout: 20000,
	headers: { 'X-M': getDeviceInfo().mac }
});

function getAPIKey()
{
	const date = new Date();
	const string = `${apiKeyPrefix}${date.getUTCMonth()}/${date.getUTCDate()}/${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}`;

	const encrypt = internalEncrypt(APIKeyEncryptionKey, string, false);

	return encrypt;
}

async function post<T extends BaseResponse>(serverPath: string, data: any): Promise<T | BaseResponse>
{
	try
	{
		const response = await axiosInstance.post(serverPath, data, { headers: { apiKeyHeader: getAPIKey() } });
		return response.data;
	}
	catch (e)
	{
		// something went wrong
	}

	return { Success: false, UnknownError: true };
}

async function get<T extends BaseResponse>(serverPath: string): Promise<T | BaseResponse>
{
	try
	{
		const response = await axiosInstance.get(serverPath, { headers: { apiKeyHeader: getAPIKey() } });
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
};

export default vaulticServer;
