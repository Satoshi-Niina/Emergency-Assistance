"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
var postgres_js_1 = require("drizzle-orm/postgres-js");
var postgres_1 = require("postgres");
var schema = require("./schema.js");
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
    var isProduction = process.env.NODE_ENV === 'production';
    var isAzure = process.env.WEBSITE_SITE_NAME || process.env.AZURE_ENVIRONMENT;
    if (isProduction || isAzure) {
        return { rejectUnauthorized: false };
    }
    return false;
}
// データベース接続
var client = (0, postgres_1.default)(getDatabaseUrl(), {
    ssl: getSSLConfig(),
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
});
// Drizzle ORMインスタンス
exports.db = (0, postgres_js_1.drizzle)(client, { schema: schema });
// デバッグ用ログ
console.log("🔍 DEBUG server/db/index.ts: データベース接続を有効化");
console.log("🔍 DEBUG server/db/index.ts: 接続先 =", getDatabaseUrl().replace(/\/\/.*@/, '//***:***@'));
console.log("🔍 DEBUG server/db/index.ts: 環境 =", {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
    WEBSITE_SITE_NAME: process.env.WEBSITE_SITE_NAME ? '[SET]' : '[NOT SET]',
    AZURE_ENVIRONMENT: process.env.AZURE_ENVIRONMENT ? '[SET]' : '[NOT SET]'
});
