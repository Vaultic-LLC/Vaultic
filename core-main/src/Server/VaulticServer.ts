import { UserController, createUserController } from "./UserController";
import { AppController, createAppController } from "./AppController";
import axiosHelper from "./AxiosHelper";
import { SessionController, createSessionController } from "./SessionController";
import { StoreController, createFilterController, createGroupController, createPasswordController } from "./StoreController";
import { ValueController, createValueController } from "./ValueController";

export interface VaulticServer
{
	app: AppController;
	session: SessionController;
	user: UserController;
	filter: StoreController;
	group: StoreController;
	password: StoreController;
	value: ValueController;
}

const vaulticServer: VaulticServer =
{
	app: createAppController(axiosHelper),
	session: createSessionController(axiosHelper),
	user: createUserController(axiosHelper),
	filter: createFilterController(axiosHelper),
	group: createGroupController(axiosHelper),
	password: createPasswordController(axiosHelper),
	value: createValueController(axiosHelper)
}

export default vaulticServer;
