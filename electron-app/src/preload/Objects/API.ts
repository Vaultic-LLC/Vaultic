import { getDeviceInfo } from './DeviceInfo';
import cryptUtility, { CryptUtility } from '../Utilities/CryptUtility';
import validationHelper, { ValidationHelper } from '../Helpers/ValidationHelper';
import hashUtility, { HashUtility } from '../Utilities/HashUtility';
import generatorUtility, { GeneratorUtility } from '../Utilities/Generator';
import files, { Files } from './Files/Files';
import { DeviceInfo } from '../Types/Device';
import vaulticServer, { VaulticServer } from "./Server/VaulticServer"

export interface Utilities
{
	crypt: CryptUtility;
	hash: HashUtility;
	generator: GeneratorUtility;
}

export interface Helpers
{
	validation: ValidationHelper;
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
	}
}

export default api;
