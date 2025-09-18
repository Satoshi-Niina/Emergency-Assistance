"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
// 簡易データベースモック（データベース接続を一時的に無効化）
exports.db = {
    execute: async function(query, params) {
        console.log('🔍 Mock database query:', query);
        // デフォルトユーザーを返す
        return [{
            id: 'default-user-id',
            username: 'admin',
            display_name: '管理者',
            role: 'admin',
            department: 'システム管理部',
            description: 'システム管理者',
            created_at: new Date().toISOString()
        }];
    }
};
// デバッグ用ログ
console.log("🔍 DEBUG api/db/index.js: モックデータベースを使用");
