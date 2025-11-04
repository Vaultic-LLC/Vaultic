import { createUserController } from "./UserController";
import { createAppController } from "./AppController";
import axiosHelper, { init } from "./AxiosHelper";
import { createSessionController } from "./SessionController";
import { createLoginController } from "./LoginController";
import { createRegistrationController } from "./RegistrationController";
import { createVaultController } from "./VaultController";
import { createOrganizationController } from "./OrganizationController";
import { Environment } from "../Types/Environment";
import { Server } from "../Types/Server";

export default function initServer(environment: Environment): Server
{
    init(environment);
    return {
        api: 
        {
            app: createAppController(axiosHelper),
            session: createSessionController(axiosHelper),
            user: createUserController(axiosHelper),
            vault: createVaultController(axiosHelper),
            organization: createOrganizationController(axiosHelper)
        },
        sts: 
        {
            login: createLoginController(axiosHelper),
            registration: createRegistrationController(axiosHelper)
        },
        axiosHelper: axiosHelper
    }
}

