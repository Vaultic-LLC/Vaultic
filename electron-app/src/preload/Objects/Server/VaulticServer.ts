import { AccountController, createAccountController } from "./AccountController";
import axiosHelper from "./AxiosHelper";
import { StoreController, createFilterController, createGroupController, createPasswordController, createValueController } from "./StoreController";

export interface VaulticServer
{
	account: AccountController;
	filter: StoreController;
	group: StoreController;
	password: StoreController;
	value: StoreController;
}

const vaulticServer: VaulticServer =
{
	account: createAccountController(axiosHelper),
	filter: createFilterController(axiosHelper),
	group: createGroupController(axiosHelper),
	password: createPasswordController(axiosHelper),
	value: createValueController(axiosHelper)
}

export default vaulticServer;
