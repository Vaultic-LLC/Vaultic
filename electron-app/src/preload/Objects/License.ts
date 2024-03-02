export enum LicenseStatus
{
	NotActivated,
	Active,
	Inactive,
	Cancelled,
	Unknown
};

export interface License
{
	expiration: number | undefined;
	key: string | undefined;
	status: LicenseStatus | undefined;
	isValid: () => boolean;
};

const currentLicense: License =
{
	expiration: undefined,
	key: undefined,
	status: undefined,
	isValid: () => currentLicense.status == LicenseStatus.Active
};

export default currentLicense;
