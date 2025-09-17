import { api } from "@renderer/API";

// This is this used so that I don't have to use the @ts-ignore everywhere
class LocalDatabaseBridge
{
    constructor() {}

    async query<T = any>(query: string): Promise<T[]>
    {
        // @ts-ignore
        return await api.environment.runLocalQuery(query);
    }
}

const localDatabase = new LocalDatabaseBridge();
export default localDatabase;