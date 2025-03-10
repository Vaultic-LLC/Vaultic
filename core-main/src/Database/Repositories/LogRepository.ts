import { Repository } from "typeorm";
import { Log } from "../Entities/Log";
import { environment } from "../../Environment";
import { BaseResponse } from "@vaultic/shared/Types/Responses";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";

class LogRepository
{
    private repository: Repository<Log>;

    constructor() { }

    init()
    {
        this.repository = environment.databaseDataSouce.getRepository(Log);
    }

    async log(errorCode?: number, message?: string, callStack?: string): Promise<boolean>
    {
        // Not verifying user, but can't really =(
        const currentUser = await environment.repositories.users.getCurrentUser();

        const log = new Log();
        log.currentUserEmail = currentUser?.email ?? "";
        log.time = new Date();
        log.errorCode = errorCode ?? -1;
        log.message = message ?? "";
        log.callStack = Error().stack + '\n' + callStack;

        try 
        {
            await this.repository.insert(log);
            return true;
        }
        catch { }

        return false;
    }

    async logBaseResponse(response: BaseResponse, message?: string): Promise<boolean>
    {
        const errorMessage = `
            Message: ${message}\n
            Unknown Error: ${response.UnknownError}\n
            Invalid Request: ${response.InvalidRequest}\n
            Status Code: ${response.statusCode}\n
            Axios Code: ${response.axiosCode}\n
        `;

        return this.log(undefined, errorMessage);
    }

    async logMethodResponse<T>(methodResponse: TypedMethodResponse<T>): Promise<boolean>
    {
        return this.log(methodResponse.errorCode, methodResponse.errorMessage, methodResponse.callStack);
    }

    async getExportableLogData(): Promise<string>
    {
        const logs = await this.repository.find();
        const data: any[][] = [];

        data.push(['Time', 'Current User Email', 'Error Code', 'Message', 'Call Stack']);

        for (let i = 0; i < logs.length; i++)
        {
            data.push([logs[i].time.toString(), logs[i].currentUserEmail, logs[i].errorCode.toString(), logs[i].message, logs[i].callStack]);
        }

        return JSON.vaulticStringify(data);;
    }

    async clearOldLogs(email: string): Promise<boolean>
    {
        const milisecondsInAMonth = 1000 * 60 * 60 * 24 * 7 * 30;
        const timeThreshold = new Date(new Date().getMilliseconds() - milisecondsInAMonth);

        try 
        {
            await this.repository
                .createQueryBuilder()
                .delete()
                .where("currentUserEmail = :email", { email })
                .andWhere("time < :timeThreshold", { timeThreshold })
                .execute();

            return true;
        }
        catch (e) 
        {
            await this.log(undefined, "Failed to clear logs");
        }

        return false;
    }
}

const logRepository = new LogRepository();
export default logRepository;
export type LogRepositoryType = typeof logRepository