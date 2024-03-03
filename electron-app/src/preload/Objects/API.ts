import { getDeviceInfo } from './DeviceInfo';
import vaulticServer, { VaulticServer } from "./VaulticServer";
import cryptUtility, { CryptUtility } from '../Utilities/CryptUtility';
import validationHelper, { ValidationHelper } from '../Helpers/ValidationHelper';
import hashUtility, { HashUtility } from '../Utilities/HashUtility';
import generatorUtility, { GeneratorUtility } from '../Utilities/Generator';
import files, { Files } from './Files/Files';
import license, { LicenseStatus } from "./License";
import licenseHelper, { LicenseHelper } from '../Helpers/LicenseHelper';
import { DeviceInfo } from '../Types/Device';

export interface Utilities
{
	crypt: CryptUtility;
	hash: HashUtility;
	generator: GeneratorUtility;
}

export interface Helpers
{
	validation: ValidationHelper;
	license: LicenseHelper;
}

export interface API
{
	device: DeviceInfo;
	server: VaulticServer;
	files: Files;
	utilities: Utilities;
	helpers: Helpers;
}

const api: API = {
	device: getDeviceInfo(),
	server: vaulticServer,	// TODO: Is this needed? yes, but only certain endpoints. Don't expose the whole server if we don't need to
	files: files,
	utilities:
	{
		crypt: cryptUtility,
		hash: hashUtility,
		generator: generatorUtility
	},
	helpers:
	{
		validation: validationHelper,
		license: licenseHelper
	}
}

export default api;
