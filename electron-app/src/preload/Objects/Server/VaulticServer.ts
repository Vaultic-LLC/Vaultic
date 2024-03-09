import { AccountController, createAccountController } from "./AccountController";
import axiosHelper from "./AxiosHelper";
import { LicenseController, createLicenseController } from "./LicenseController";
import { StoreController, createFilterController, createGroupController, createPasswordController, createValueController } from "./StoreController";

export interface VaulticServer
{
	account: AccountController;
	license: LicenseController;
	filter: StoreController;
	group: StoreController;
	password: StoreController;
	value: StoreController;
}

const vaulticServer: VaulticServer =
{
	account: createAccountController(axiosHelper),
	license: createLicenseController(axiosHelper),
	filter: createFilterController(axiosHelper),
	group: createGroupController(axiosHelper),
	password: createPasswordController(axiosHelper),
	value: createValueController(axiosHelper)
}

export default vaulticServer;
