import axios, { AxiosInstance } from 'axios';
import { FilterStoreState, GroupStoreState, PasswordStoreState, User, UserData, UserVault, ValueStoreState, Vault, VaultPreferencesStoreState, VaultStoreState } from './types/serverSchema';

type QueryResult<T = any> = 
{
    success: boolean;
    rows: T[];
    rowCount: number;
    fields: { name: string; dataTypeID: number }[];
}

/**
 * Bridge that sends requests to the server setup via database-api-server.ts in order to query the server database.
 */
class ServerDatabaseBridge
{
    private queryEndpoint: string;
    private httpClient: AxiosInstance;

    constructor(queryEndpoint: string) 
    {
        this.queryEndpoint = queryEndpoint;
        // Create HTTP client for API requests
        this.httpClient = axios.create({
            baseURL: 'http://localhost:3000/api/db',
            timeout: 10000,
            headers: 
            {
                'Content-Type': 'application/json',
            }
        });
    }

    /**
     * Execute a raw SQL query via HTTP API
     */
    async query<T = any>(sql: string, params?: any[]): Promise<T[]> 
    {
        try 
        {
            const response = await this.httpClient.post(`/${this.queryEndpoint}`, 
            {
                sql,
                params: params || []
            });

            const data: QueryResult<T> | undefined = response.data;
            
            if (data && data.success) 
            {
                return data.rows || [];
            } 
            else 
            {
                throw new Error('Query failed');
            }
        } 
        catch (error) 
        {
            console.error('Query failed:', error);
            throw error;
        }
    }
}

class PublicServerDatabaseBridge extends ServerDatabaseBridge
{
    constructor()
    {
        super('queryPublic');
    }

    async getUserByID(userID: number): Promise<(User & UserData) | undefined>
    {
        const result = await this.query<User & UserData>(`
            SELECT * 
            FROM "Users" AS u
            INNER JOIN "UserDatas" ON "u"."UserID" = "UserDatas"."UserID"
            WHERE "u"."UserID" = ${userID}`);

        if (result.length === 0)
        {
            return undefined;
        }

        return result[0];
    }

    async getAllVaultDataByID(userVaultID: number): Promise<(UserVault & VaultPreferencesStoreState & Vault &
        VaultStoreState & PasswordStoreState & ValueStoreState & FilterStoreState & GroupStoreState) | undefined>
    {
        const result = await this.query(`
            SELECT * 
            FROM "UserVaults" AS uv
            INNER JOIN "VaultPreferencesStoreStates" vp ON "uv"."UserVaultID" = "vp"."UserVaultID"
            INNER JOIN "OrganizationVaults" ov ON "ov"."UserVaultID" = "vp"."UserVaultID"
            INNER JOIN "Vaults" v ON "ov"."VaultID" = "v"."VaultID"
            INNER JOIN "VaultStoreStates" vss ON "vss"."VaultID" = "v"."VaultID"
            INNER JOIN "PasswordStoreStates" pss ON "pss"."VaultID" = "v"."VaultID"
            INNER JOIN "ValueStoreStates" vass ON "vass"."VaultID" = "v"."VaultID"
            INNER JOIN "FilterStoreStates" fss ON "fss"."VaultID" = "v"."VaultID"
            INNER JOIN "GroupStoreStates" gss ON "gss"."VaultID" = "v"."VaultID"
            WHERE "uv"."UserVaultID" = ${userVaultID}`);

        if (result.length === 0)
        {
            return undefined;
        }

        return result[0];
    } 

    async getVaultIDsForUser(userID: number): Promise<{ VaultID: Number, UserVaultID: Number, UserOrganizationID: number}[]>
    {
        return await this.query<{ VaultID: Number, UserVaultID: Number, UserOrganizationID: number}>(`
            SELECT v."VaultID", uv."UserVaultID", uo."UserOrganizationID"
            FROM "Users" u
            INNER JOIN "UserOrganizations" uo ON u."UserID" = uo."UserID"
            INNER JOIN "UserVaults" uv ON uo."UserOrganizationID" = uv."UserOrganizationID"
            INNER JOIN "OrganizationVaults" ov ON uv."OrganizationVaultID" = ov."OrganizationVaultID"
            INNER JOIN "Vaults" v ON ov."VaultID" = v."VaultID"
            WHERE u."UserID" = ${userID}`);
    }
}

class PrivateServerDatabaseBridge extends ServerDatabaseBridge
{
    constructor()
    {
        super('queryPrivate');
    }
}

// Create a default instance with standard configuration
export const publicServerDB = new PublicServerDatabaseBridge();
export const privateServerDB = new PrivateServerDatabaseBridge();