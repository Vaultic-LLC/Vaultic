import files from "../Objects/Files/Files";
import currentLicense, { LicenseStatus } from "../Objects/License";
import vaulticServer from "../Objects/VaulticServer";
import { CheckLicenseResponse } from "../Types/Responses";

export interface LicenseHelper
{
	currentLicenseStatus: () => LicenseStatus | undefined;
	checkLicense: () => Promise<CheckLicenseResponse>;
}

function currentLicenseStatus()
{
	return currentLicense.status;
}

async function checkLicense(): Promise<CheckLicenseResponse>
{
	const exists = await files.license.exists();
	if (exists)
	{
		const licenseKey: string = await files.license.read();
		if (!licenseKey)
		{
			// need to prompt for username / password and re get license
			currentLicense.status = LicenseStatus.Unknown;
			return {
				Success: false,
				UnknownLicense: true
			}
		}

		const response = await vaulticServer.checkLicense(licenseKey);
		if (response.Success)
		{
			await files.license.write(currentLicense.key as string);

			currentLicense.key = response.Key;
			currentLicense.expiration = Date.parse(response.Expiration as string);
			currentLicense.status = LicenseStatus.Active;

			startCheckingLicenseExpiration();
		}
		else
		{
			if (response.LicenseStatus)
			{
				currentLicense.status = response.LicenseStatus;
			}
			else if (response.LicenseIsExpired)
			{
				currentLicense.status = LicenseStatus.Inactive;
			}

			currentLicense.status = LicenseStatus.Unknown;
		}

		return response;
	}
	else
	{
		// need to prompt for username / password and re get license
		currentLicense.status = LicenseStatus.Unknown;
	}

	return { Success: false, UnknownLicense: true };

	return {
		Success: false,
		UnknownLicense: true
	}
}

function startCheckingLicenseExpiration()
{
	const intervalID = setInterval(() =>
	{
		if (currentLicense.expiration != undefined && currentLicense.expiration >= Date.now())
		{
			clearInterval(intervalID);
			currentLicense.status = LicenseStatus.Inactive;
		}

	}, 600000);
}

const licenseHelper: LicenseHelper =
{
	currentLicenseStatus,
	checkLicense
}

export default licenseHelper;
