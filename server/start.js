#!/usr/bin/env node

/**
 * Azure App Service用起動スクリプト（シンプル版）
 */

console.log('🚀 Azure App Service起動スクリプト開始...');

// 環境変数の確認
console.log('🔍 環境変数確認:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET'
});

// アプリケーション起動
console.log('🚀 アプリケーション起動中...');

try {
  // まずビルドされたファイルを試行
  console.log('📁 ビルドファイルを読み込み中...');
  require('./dist/index.js');
  console.log('✅ ビルドファイルから起動成功');
} catch (error) {
  console.error('❌ ビルドファイル起動エラー:', error.message);
  
  try {
    // フォールバック: TypeScriptファイルを直接実行
    console.log('🔄 TypeScriptファイルを直接実行中...');
    require('tsx');
    require('./index.ts');
    console.log('✅ TypeScriptファイルから起動成功');
  } catch (fallbackError) {
    console.error('❌ TypeScriptファイル起動エラー:', fallbackError.message);
    
    try {
      // 最後の手段: 基本的なExpressサーバーを起動
      console.log('🆘 基本的なExpressサーバーを起動中...');
      const express = require('express');
      const app = express();
      const PORT = process.env.PORT || 8080;
      
      app.get('/api/health', (req, res) => {
        res.json({ 
          status: 'ok', 
          message: 'Basic server is running',
          timestamp: new Date().toISOString()
        });
      });
      
      app.get('/api/auth/login', (req, res) => {
        res.status(405).json({ 
          error: 'Method not allowed',
          message: 'POST method required for login'
        });
      });
      
      app.listen(PORT, () => {
        console.log(`✅ 基本的なサーバーが起動しました: http://0.0.0.0:${PORT}`);
      });
    } catch (basicError) {
      console.error('❌ 基本的なサーバー起動エラー:', basicError.message);
      process.exit(1);
    }
  }
} 