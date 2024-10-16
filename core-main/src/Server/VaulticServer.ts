import { UserController, createUserController } from "./UserController";
import { createAppController } from "./AppController";
import { AppController } from "@vaultic/shared/Types/Controllers";
import axiosHelper from "./AxiosHelper";
import { SessionController, createSessionController } from "./SessionController";
import { createValueController } from "./ValueController";
import { ValueController } from "@vaultic/shared/Types/Controllers";
import { LoginController, createLoginController } from "./LoginController";
import { RegistrationController, createRegistrationController } from "./RegistrationController";
import { createVaultController, VaultController } from "./VaultController";

export interface VaulticServer
{
    app: AppController;
    session: SessionController;
    user: UserController;
    value: ValueController;
    vault: VaultController;
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
    value: createValueController(axiosHelper),
    vault: createVaultController(axiosHelper)
}

export default vaulticServer;
export const stsServer: STSServer =
{
    login: createLoginController(axiosHelper),
    registration: createRegistrationController(axiosHelper)
};

