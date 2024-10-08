import { Repository } from "typeorm";
import { Log } from "../Entities/Log";
import { environment } from "../../Environment";
import { MethodResponse } from "../../Types/MethodResponse";

class LogRepository
{
    private repository: Repository<Log>;

    constructor()
    {
    }

    init()
    {
        this.repository = environment.databaseDataSouce.getRepository(Log);
    }

    async log(errorCode?: number, message?: string, callStack?: string): Promise<boolean>
    {
        const currentUser = await environment.repositories.users.getCurrentUser();

        const log = new Log();
        log.currentUserEmail = currentUser?.email ?? "";
        log.time = new Date();
        log.errorCode = errorCode ?? -1;
        log.message = message ?? "";
        log.callStack = callStack ?? "";

        try 
        {
            await this.repository.insert(log);
            return true;
        }
        catch { }

        return false;
    }

    async logMethodResponse(methodResponse: MethodResponse, callStack?: string): Promise<boolean>
    {
        return this.log(methodResponse.errorCode, methodResponse.errorMessage, callStack);
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

        return JSON.stringify(data);;
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
            console.log(`Failed to clear logs: ${e}`);
        }

        return false;
    }
}

const logRepository = new LogRepository();
export default logRepository;
export type LogRepositoryType = typeof logRepository