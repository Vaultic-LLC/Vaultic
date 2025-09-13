import axios, { AxiosInstance } from 'axios';

/**
 * Bridge that sends requests to the server setup via database-api-server.ts in order to query the server database.
 */
class ServerDatabaseBridge
{
    private httpClient: AxiosInstance;

    constructor() 
    {
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
            const response = await this.httpClient.post('/query', 
            {
                sql,
                params: params || []
            });
            
            if (response.data && response.data.success) 
            {
                return response.data.rows || [];
            } 
            else 
            {
                throw new Error(response.data?.error || 'Query failed');
            }
        } 
        catch (error) 
        {
            console.error('Query failed:', error);
            throw error;
        }
    }
}

// Create a default instance with standard configuration
export const serverDB = new ServerDatabaseBridge();