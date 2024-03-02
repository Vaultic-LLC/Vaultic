import axios from 'axios';
import { getDeviceInfo } from './DeviceInfo';
import { CheckLicenseResponse, CreateAccountResponse, GenerateMFAResponse, ValidateEmailAndUsernameResponse, ValidateMFACodeResponse, ValidateUsernameAndPasswordResponse } from '../Types/Responses';

export interface VaulticServer
{
	checkLicense: (license: string) => Promise<CheckLicenseResponse>;
	validateUsernameAndPassword: (username: string, password: string) => Promise<ValidateUsernameAndPasswordResponse>;
	validateEmailAndUsername: (email: string, username: string) => Promise<ValidateEmailAndUsernameResponse>;
	generateMFA: () => Promise<GenerateMFAResponse>;
	createAccount: (firstName: string, lastName: string, email: string, username: string, password: string,
		mfaKey: string, mfaCode: string, createdTime: number) => Promise<CreateAccountResponse>;
	validateMFACode(username: string, password: string, mfaCode: string): Promise<ValidateMFACodeResponse>
}

const apiKey = "akljffoifiohop2p23t2jfio3jfio12oijoi;j3io;ojijLJG:SJGfoi;gSHOIF:ioh2o1th1o2hSHFIOS:Hoi;hfo2h908t1ht81hoihIhoih1hpFKLJFHSJKLFhsdkjlfSFsdp[fl[,{SDF,oisf;JSDf;ji;h12KLDFn"

const axiosInstance = axios.create({
	baseURL: 'https://some-domain.com/api/',
	timeout: 20000,
	data: {
		APIKey: apiKey,
		MacAddress: getDeviceInfo().mac
	}
});

async function checkLicense(license: string): Promise<CheckLicenseResponse>
{
	if (!license)
	{
		await new Promise((resolve) => setTimeout(resolve, 5000));
		return { Success: true };
		return { Success: false };
	}

	try
	{
		const response = await axiosInstance.post("License/CheckLicenseKey", {
			License: license
		});

		const licenseResponse: CheckLicenseResponse = JSON.parse(response.data);
		return licenseResponse;
	}
	catch (e)
	{
		// Log error to server
	}

	return { Success: false };
}

async function validateEmailAndUsername(email: string, username: string): Promise<ValidateEmailAndUsernameResponse>
{
	try
	{
		const response = await axiosInstance.post('Account/ValidateEmailAndUsername',
			{
				Email: email,
				Username: username
			});

		const responseObj: ValidateEmailAndUsernameResponse = JSON.parse(response.data);
		return responseObj;
	}
	catch { }

	return { Success: false };
}

async function generateMFA(): Promise<GenerateMFAResponse>
{
	try
	{
		const response = await axiosInstance.post('Account/GenerateMFA');

		const responseObj: GenerateMFAResponse = JSON.parse(response.data);
		return responseObj;

	}
	catch { }

	return { Success: false };
}

async function createAccount(firstName: string, lastName: string, email: string, username: string, password: string,
	mfaKey: string, mfaCode: string, createdTime: number): Promise<CreateAccountResponse>
{
	try
	{
		const response = await axiosInstance.post('Account/GenerateMFA',
			{
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

		// update  license
		const responseObj: CreateAccountResponse = JSON.parse(response.data);
		return responseObj;
	}
	catch { }

	return { Success: false };
}

async function validateUsernameAndPassword(username: string, password: string): Promise<ValidateUsernameAndPasswordResponse>
{
	try
	{
		const response = await axiosInstance.post('Account/ValidateEmailAndUsername',
			{
				Username: username,
				Password: password
			});

		const responseObj: ValidateUsernameAndPasswordResponse = JSON.parse(response.data);
		return responseObj;
	}
	catch { }

	return { Success: false };
}

async function validateMFACode(username: string, password: string, mfaCode: string): Promise<ValidateMFACodeResponse>
{
	try
	{
		const response = await axiosInstance.post('Account/GenerateMFA',
			{
				Username: username,
				Password: password,
				MFACode: mfaCode,
			});

		// update  license
		const responseObj: ValidateUsernameAndPasswordResponse = JSON.parse(response.data);
		return responseObj;
	}
	catch { }

	return { Success: false };
}

const vaulticServer: VaulticServer =
{
	checkLicense,
	validateUsernameAndPassword,
	validateEmailAndUsername,
	generateMFA,
	createAccount,
	validateMFACode
};

export default vaulticServer;
