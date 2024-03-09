import { CheckLicenseResponse } from "../../Types/Responses";
import { AxiosHelper } from "./AxiosHelper";
import { LicenseStatus } from "../License";

export interface LicenseController
{
	checkLicense: (license: string) => Promise<CheckLicenseResponse>;

}

export function createLicenseController(axiosHelper: AxiosHelper): LicenseController
{
	async function checkLicense(license: string): Promise<CheckLicenseResponse>
	{
		if (!license)
		{
			return { Success: false, LicenseStatus: LicenseStatus.Unknown };
		}

		return axiosHelper.post("License/CheckLicenseKey", { License: license });
	}

	return {
		checkLicense
	}
}
