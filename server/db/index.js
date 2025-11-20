import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
// セーフモード判定
const isSafeMode = process.env.SAFE_MODE === 'true';
// データベース接続設定
function getDatabaseUrl() {
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }
    // webappdbに接続（DBeaverで確認済み）
    return 'postgresql://postgres@localhost:5432/webappdb';
}
// 本番環境でのSSL設定
function getSSLConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    const isAzure = process.env.WEBSITE_SITE_NAME || process.env.AZURE_ENVIRONMENT;
    if (isProduction || isAzure) {
        return { rejectUnauthorized: false };
    }
    return false;
}
// セーフモード用のダミーDB実装
const createSafeModeDB = () => ({
    select: () => ({
        from: () => ({
            where: () => ({
                limit: () => [],
                execute: () => Promise.resolve([]),
            }),
            execute: () => Promise.resolve([]),
        }),
        execute: () => Promise.resolve([]),
    }),
    insert: () => ({
        values: () => ({
            returning: () => ({
                execute: () => Promise.resolve([]),
            }),
            execute: () => Promise.resolve([]),
        }),
        execute: () => Promise.resolve([]),
    }),
    update: () => ({
        set: () => ({
            where: () => ({
                returning: () => ({
                    execute: () => Promise.resolve([]),
                }),
                execute: () => Promise.resolve([]),
            }),
            execute: () => Promise.resolve([]),
        }),
        execute: () => Promise.resolve([]),
    }),
    delete: () => ({
        where: () => ({
            returning: () => ({
                execute: () => Promise.resolve([]),
            }),
            execute: () => Promise.resolve([]),
        }),
        execute: () => Promise.resolve([]),
    }),
    execute: () => Promise.resolve([]),
});
// セーフモード用のダミーDB接続
let client = null;
let dbInstance = null;
// セーフモードでない場合のみDB接続を初期化
if (!isSafeMode) {
    try {
        client = postgres(getDatabaseUrl(), {
            ssl: getSSLConfig(),
            max: 10,
            idle_timeout: 20,
            connect_timeout: 10,
            prepare: false,
        });
        dbInstance = drizzle(client, { schema });
        console.log('🔍 DEBUG server/db/index.ts: データベース接続を有効化');
        console.log('🔍 DEBUG server/db/index.ts: 接続先 =', getDatabaseUrl().replace(/\/\/.*@/, '//***:***@'));
        // 接続プールの準備完了ログ
        console.log('✅ DB: connection pool ready');
    }
    catch (error) {
        console.error('❌ データベース接続エラー:', error);
        console.log('🛡️ セーフモードに切り替えます');
        process.env.SAFE_MODE = 'true';
        client = null;
        dbInstance = null;
    }
}
else {
    console.log('🛡️ セーフモード: データベース接続をスキップ');
}
// DBインスタンスのエクスポート（セーフモード対応）
export const db = dbInstance || createSafeModeDB();
// デバッグ用ログ
console.log('🔍 DEBUG server/db/index.ts: 環境 =', {
    NODE_ENV: process.env.NODE_ENV,
    SAFE_MODE: isSafeMode,
    DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
    WEBSITE_SITE_NAME: process.env.WEBSITE_SITE_NAME ? '[SET]' : '[NOT SET]',
    AZURE_ENVIRONMENT: process.env.AZURE_ENVIRONMENT ? '[SET]' : '[NOT SET]',
    DB_CONNECTED: !!dbInstance,
});
