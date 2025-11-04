import { AppController, SessionController, OrganizationController } from "@vaultic/shared/Types/Controllers";
import { AxiosHelper } from "../Server/AxiosHelper";
import { LoginController } from "../Server/LoginController";
import { RegistrationController } from "../Server/RegistrationController";
import { UserController } from "../Server/UserController";
import { VaultController } from "../Server/VaultController";

export interface Server
{
    api: VaulticServer;
    sts: STSServer;
    axiosHelper: AxiosHelper;
}

export interface VaulticServer
{
    app: AppController;
    session: SessionController;
    user: UserController;
    vault: VaultController;
    organization: OrganizationController;
}

export interface STSServer 
{
    login: LoginController;
    registration: RegistrationController;
};