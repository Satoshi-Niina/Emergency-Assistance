module.exports = async function (context, req) {
    try {
        context.log('Health check HTTP trigger function processed a request.');

        // OPTIONSリクエストの処理
        if (req.method === 'OPTIONS') {
            context.res = {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400'
                },
                body: ''
            };
            return;
        }

        // データベース接続テスト
        let dbStatus = 'unknown';
        let dbError = null;
        try {
            const { db } = require('../db/index.js');
            await db.execute('SELECT 1 as test');
            dbStatus = 'connected';
        } catch (error) {
            dbStatus = 'error';
            dbError = error.message;
            context.log.warn('Database connection test failed:', error.message);
        }

        // Azure Storage接続テスト
        let storageStatus = 'unknown';
        let storageError = null;
        try {
            const { BlobServiceClient } = require('@azure/storage-blob');
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || process.env.BLOB_CONTAINER_NAME || 'knowledge';
            if (connectionString) {
                const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
                const containerClient = blobServiceClient.getContainerClient(containerName);
                await containerClient.exists();
                storageStatus = 'connected';
            } else {
                storageStatus = 'not_configured';
                storageError = 'AZURE_STORAGE_CONNECTION_STRING not set';
            }
        } catch (error) {
            storageStatus = 'error';
            storageError = error.message;
            context.log.warn('Storage connection test failed:', error.message);
        }

        const healthStatus = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {
                database: {
                    status: dbStatus,
                    error: dbError
                },
                storage: {
                    status: storageStatus,
                    error: storageError,
                    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || process.env.BLOB_CONTAINER_NAME || 'knowledge'
                }
            },
            environment: {
                NODE_ENV: process.env.NODE_ENV || 'development',
                hasDatabaseUrl: !!process.env.DATABASE_URL,
                hasStorageConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING
            }
        };

        // 全体のステータスを決定
        if (dbStatus === 'error' || storageStatus === 'error') {
            healthStatus.status = 'degraded';
        }

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify(healthStatus)
        };
    } catch (error) {
        context.log.error('Error in health check function:', error);
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                status: 'error',
                error: 'Health check failed',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};
