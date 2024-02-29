import axios from 'axios';
import { getDeviceInfo } from './DeviceInfo';

export enum LicenseStatus
{
	Active,
	Inactive
};

export interface VaulticServer
{
	checkLicense: (license: string) => Promise<boolean>;
}

export default function useVaulticServer(): VaulticServer
{
	const apiKey = "akljffoifiohop2p23t2jfio3jfio12oijoi;j3io;ojijLJG:SJGfoi;gSHOIF:ioh2o1th1o2hSHFIOS:Hoi;hfo2h908t1ht81hoihIhoih1hpFKLJFHSJKLFhsdkjlfSFsdp[fl[,{SDF,oisf;JSDf;ji;h12KLDFn"

	const axiosInstance = axios.create({
		baseURL: 'https://some-domain.com/api/',
		timeout: 20000,
		data: {
			APIKey: apiKey,
			MacAddress: getDeviceInfo().mac
		}
	});

	async function checkLicense(license: string): Promise<boolean>
	{
		if (!license)
		{
			await new Promise((resolve) => setTimeout(resolve, 5000));
			return true;
			return false;
		}

		try
		{
			const response = await axiosInstance.post("License/CheckLicenseKey", {
				License: license
			});

			return !!response;
		}
		catch (e)
		{

		}

		return false;
	}

	return {
		checkLicense
	}
}
