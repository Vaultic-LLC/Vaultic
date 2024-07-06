import { UserController, createUserController } from "./UserController";
import { AppController, createAppController } from "./AppController";
import axiosHelper from "./AxiosHelper";
import { SessionController, createSessionController } from "./SessionController";
import { StoreController, createFilterController, createGroupController, createPasswordController } from "./StoreController";
import { ValueController, createValueController } from "./ValueController";
import { LoginController, createLoginController } from "./loginController";
import { RegistrationController, createRegistrationController } from "./RegistrationController";

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

export interface STSServer 
{
    login: LoginController;
    registration: RegistrationController;
};

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
export const stsServer: STSServer =
{
    login: createLoginController(axiosHelper),
    registration: createRegistrationController(axiosHelper)
};

