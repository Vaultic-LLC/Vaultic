import { getDeviceInfo } from './DeviceInfo';
import cryptUtility, { CryptUtility } from '../Utilities/CryptUtility';
import validationHelper, { ValidationHelper } from '../Helpers/ValidationHelper';
import hashUtility, { HashUtility } from '../Utilities/HashUtility';
import generatorUtility, { GeneratorUtility } from '../Utilities/Generator';
import files, { Files } from './Files/Files';
import licenseHelper, { LicenseHelper } from '../Helpers/LicenseHelper';
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

const test: string = "Ab^_^M$EkAw%SEpf(=oaWV>O0}LRsR";
const salt: string = "N9{l@*.+KwSx|>K{9{BhZGtCs3Rfi2";

const saltedHash = hashUtility.hash(test, salt);
const hash = hashUtility.hash(test);

const key: string = "Key";
const encryption = cryptUtility.encrypt(key, test);

Promise.all([saltedHash, hash]).then((data) =>
{
	console.log(`Salted Hash: ${data[0]}`);
	console.log(`Regular Hash: ${data[1]}`);
});

encryption.then((enc) =>
{
	cryptUtility.decrypt(key, enc).then((dec) =>
	{
		console.log(`Encryption: ${enc}`);
		console.log(`Decryption: ${dec}`);
	})
})


export default api;
