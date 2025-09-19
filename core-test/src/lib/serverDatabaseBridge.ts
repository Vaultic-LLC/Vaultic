import { AllowSharingFrom } from '@vaultic/shared/Types/ClientServerTypes';
import { RequireMFAOn } from '@vaultic/shared/Types/Device';
import axios, { AxiosInstance } from 'axios';

type QueryResult<T = any> = 
{
    success: boolean;
    rows: T[];
    rowCount: number;
    fields: { name: string; dataTypeID: number }[];
}

type SchemaObject =
{
    CreatedTime: number | undefined;
    LastModifiedTime: number | undefined;
}

type User = SchemaObject &
{
    UserID: number | undefined;
    FirstName: string | undefined;
    LastName: string | undefined;
    Email: string | undefined;
    Username: string | undefined;

    RegistrationRecord: string | undefined;
    UserIdentifier: string | undefined;

    // public License License { get; set; }
    // public Session Session { get; set; }
    // public StripeData StripeData { get; set; }
}

type UserData = SchemaObject &
{
    UserDataID: number | undefined;
    UserID: number | undefined;

    CurrentSignature: string | undefined;
    MasterKeyEncryptionAlgorithm: string | undefined;
    PublicSigningKey: string | undefined;
    PrivateSigningKey: string | undefined;
    PublicEncryptingKey: string | undefined;
    PrivateEncryptingKey: string | undefined;
    AllowSharedVaultsFromOthers: string | undefined;
    KSFParams: string | undefined;

    DeviceSalt: string | undefined;

    AllowSharingFrom: AllowSharingFrom | undefined;
    RequireMFAOn: RequireMFAOn | undefined;

    LastLoadedChangeTrackingVersion: number | undefined;
}

type Vault = SchemaObject &
{
    VaultID: number | undefined;
    CurrentSignature: string | undefined;
    Name: string | undefined;
    IsArchived: boolean | undefined;
    IsShared: boolean | undefined;
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