/**
 * Simple Node.js API server to bridge browser tests with PostgreSQL Docker container
 */

import express from 'express';
import { Client } from 'pg';
import cors from 'cors';

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection configuration
const dbConfig =
{
    host: 'localhost',
    port: 5432,
    database: 'vaulticTest',
    user: 'root',
    password: 'root',
};

// Execute raw SQL query
app.post('/api/db/query', async (req, res) =>
{
    const { sql, params = [] } = req.body;

    if (!sql)
    {
        return res.status(400).json({ success: false, error: 'SQL query is required' });
    }

    let client;
    try
    {
        client = new Client(dbConfig);
        await client.connect();

        const result = await client.query(sql, params);
        res.json({
            success: true,
            rows: result.rows,
            rowCount: result.rowCount,
            fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID }))
        });
    }
    catch (error)
    {
        console.error('Query failed:', error);
        res.status(500).json({ success: false });
    }
    finally
    {
        if (client)
        {
            await client.end();
        }
    }
});

// Start server
app.listen(port, () =>
{
    console.log(`Database API server running at http://localhost:${port}`);
    console.log('Available endpoints:');
    console.log('  POST /api/db/query - Execute raw SQL');
});

// Graceful shutdown
process.on('SIGINT', () =>
{
    console.log('\nShutting down database API server...');
    process.exit(0);
});