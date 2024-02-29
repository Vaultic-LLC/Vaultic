import { DeviceInfo, getDeviceInfo } from './DeviceInfo';
import userVaulticServer, { VaulticServer } from "./Server";
import cryptUtility, { CryptUtility } from '../Utilities/CryptUtility';
import validationHelper, { ValidationHelper } from '../Helpers/ValidationHelper';
import hashUtility, { HashUtility } from '../Utilities/HashUtility';
import generatorUtility, { GeneratorUtility } from '../Utilities/Generator';
import files, { Files } from './Files/Files';

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
	server: userVaulticServer(),
	files: files,
	utilities:
	{
		crypt: cryptUtility,
		hash: hashUtility,
		generator: generatorUtility
	},
	helpers:
	{
		validation: validationHelper
	}
}

export default api;
