"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = exports.closePool = exports.transaction = exports.query = exports.sql = void 0;
const postgres_1 = __importDefault(require("postgres"));
// データベース接続設定 - DATABASE_URLのみを使用
const sql = (0, postgres_1.default)(process.env.DATABASE_URL ||
    'postgresql://postgres:CHANGE_THIS_PASSWORD@localhost:5432/webappdb', {
    // 使用中: データベース接続文字列
    ssl: process.env.NODE_ENV === 'production'
        ? { require: true, rejectUnauthorized: false }
        : false, // 使用中: 環境判別
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
});
exports.sql = sql;
// クエリ実行関数
const query = async (text, params) => {
    try {
        const result = await sql.unsafe(text, params);
        return result;
    }
    catch (error) {
        console.error('❌ クエリ実行エラー:', error);
        throw error;
    }
};
exports.query = query;
// トランザクション実行関数
const transaction = async (callback) => {
    try {
        return await sql.begin(async (tx) => {
            return await callback(tx);
        });
    }
    catch (error) {
        console.error('❌ トランザクションエラー:', error);
        throw error;
    }
};
exports.transaction = transaction;
// 接続プールを閉じる関数
const closePool = async () => {
    await sql.end();
};
exports.closePool = closePool;
// データベース接続テスト
const testConnection = async () => {
    try {
        const result = await (0, exports.query)('SELECT NOW()');
        console.log('✅ データベース接続テスト成功:', result[0]);
        return true;
    }
    catch (error) {
        console.error('❌ データベース接続テスト失敗:', error);
        return false;
    }
};
exports.testConnection = testConnection;
// デフォルトエクスポート
exports.default = {
    query: exports.query,
    transaction: exports.transaction,
    closePool: exports.closePool,
    testConnection: exports.testConnection,
    sql,
};
